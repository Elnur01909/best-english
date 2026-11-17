"""`python -m leadsbot page` PDF faylları da oxuyur: tender fayllarının son müddəti onların içindədir."""
from unittest.mock import patch

import pytest

from leadsbot import __main__ as entry
from leadsbot.sources import FetchError
from leadsbot.watch import PDF_MAX_PAGES, read_page

URL = "https://rm.example.org/tender-file/1680b59a45"


def make_pdf(pages):
    """Hər səhifəsində bir sətir mətn olan sadə PDF (şəbəkəsiz test üçün)."""
    font = len(pages) * 2 + 3
    kids = " ".join(f"{3 + 2 * n} 0 R" for n in range(len(pages)))
    objs = ["<< /Type /Catalog /Pages 2 0 R >>", f"<< /Type /Pages /Kids [{kids}] /Count {len(pages)} >>"]
    for n, line in enumerate(pages):
        stream = f"BT /F1 12 Tf 72 720 Td ({line}) Tj ET"
        objs.append(f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents {4 + 2 * n} 0 R "
                    f"/Resources << /Font << /F1 {font} 0 R >> >> >>")
        objs.append(f"<< /Length {len(stream)} >>\nstream\n{stream}\nendstream")
    objs.append("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
    out, offsets = b"%PDF-1.4\n", []
    for n, body in enumerate(objs, 1):
        offsets.append(len(out))
        out += f"{n} 0 obj\n{body}\nendobj\n".encode("latin-1")
    xref = len(out)
    out += f"xref\n0 {len(objs) + 1}\n0000000000 65535 f \n".encode()
    out += b"".join(f"{o:010d} 00000 n \n".encode() for o in offsets)
    return out + f"trailer\n<< /Size {len(objs) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode()


class PdfResp:
    url = URL

    def __init__(self, content, ctype="application/pdf"):
        self.content = content
        self.headers = {"Content-Type": ctype}


def serve(resp):
    return patch("leadsbot.watch._request", lambda *a, **k: resp)


def test_page_reads_pdf_tender_file(capsys):
    pdf = make_pdf(["TENDER FILE   Local consultancy services", "Deadline for submission of tenders 14 May 2025 Baku time"])
    with serve(PdfResp(pdf)):
        text = read_page(URL, "ua")
        assert entry.main(["page", URL, "--chars", "30"]) == 0
    assert text.startswith(f"PDF, 2 səhifə\n{URL}\n\n")
    assert "TENDER FILE Local consultancy services Deadline for submission of tenders 14 May 2025 Baku time" in text
    out = capsys.readouterr().out
    assert "14 May 2025" not in out and "--chars 95" in out  # kəsilibsə, tam uzunluq deyilir


def test_pdf_is_recognised_without_its_content_type():
    with serve(PdfResp(make_pdf(["Call for experts"]), ctype="application/octet-stream")):
        assert "Call for experts" in read_page(URL, "ua")


def test_long_pdf_is_read_up_to_the_page_limit():
    with serve(PdfResp(make_pdf([f"Page {n}" for n in range(1, PDF_MAX_PAGES + 3)]))):
        text = read_page(URL, "ua", chars=100000)
    assert f"PDF, {PDF_MAX_PAGES + 2} səhifə, ilk {PDF_MAX_PAGES} səhifə oxundu" in text
    assert f"Page {PDF_MAX_PAGES}" in text and f"Page {PDF_MAX_PAGES + 1}" not in text


def test_pdf_without_text_says_so():
    with serve(PdfResp(make_pdf([""]))):
        assert "Faylda mətn yoxdur" in read_page(URL, "ua")


def test_broken_pdf_or_missing_package_is_a_clear_error(capsys):
    with serve(PdfResp(b"%PDF-1.7 not really a pdf")):
        with pytest.raises(FetchError, match="PDF açılmadı"):
            read_page(URL, "ua")
        assert entry.main(["page", URL]) == 1
    assert "Səhifə oxunmadı: PDF açılmadı" in capsys.readouterr().out
    with serve(PdfResp(make_pdf(["x"]))), patch.dict("sys.modules", {"pypdf": None}):
        with pytest.raises(FetchError, match="pypdf"):
            read_page(URL, "ua")
