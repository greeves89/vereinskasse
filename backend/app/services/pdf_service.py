from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, HRFlowable
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from io import BytesIO
from typing import List, Dict, Any
from decimal import Decimal
from datetime import date


def generate_jahresabschluss_pdf(
    organization_name: str,
    year: int,
    transactions: List[Dict[str, Any]],
    summary: Dict[str, Any],
) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=2 * cm,
        leftMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
        title=f"Jahresabschluss {year} - {organization_name}",
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "CustomTitle",
        parent=styles["Title"],
        fontSize=20,
        textColor=colors.HexColor("#1e40af"),
        spaceAfter=6,
        alignment=TA_CENTER,
    )
    subtitle_style = ParagraphStyle(
        "Subtitle",
        parent=styles["Normal"],
        fontSize=12,
        textColor=colors.HexColor("#6b7280"),
        spaceAfter=20,
        alignment=TA_CENTER,
    )
    section_style = ParagraphStyle(
        "Section",
        parent=styles["Heading2"],
        fontSize=14,
        textColor=colors.HexColor("#1f2937"),
        spaceBefore=20,
        spaceAfter=10,
    )
    normal_style = styles["Normal"]
    normal_style.fontSize = 10

    story = []

    # Header
    story.append(Paragraph("VereinsKasse", title_style))
    story.append(Paragraph(f"Jahresabschluss {year}", subtitle_style))
    story.append(Paragraph(organization_name, subtitle_style))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#3b82f6")))
    story.append(Spacer(1, 20))

    # Summary box
    story.append(Paragraph("Zusammenfassung", section_style))
    summary_data = [
        ["Gesamteinnahmen", f"{summary.get('total_income', 0):.2f} €"],
        ["Gesamtausgaben", f"{summary.get('total_expense', 0):.2f} €"],
        ["Jahresergebnis", f"{summary.get('balance', 0):.2f} €"],
        ["Anzahl Buchungen", str(summary.get('count', 0))],
    ]
    summary_table = Table(summary_data, colWidths=[10 * cm, 6 * cm])
    summary_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f0f9ff")),
        ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#374151")),
        ("TEXTCOLOR", (1, 0), (1, -1), colors.HexColor("#1e40af")),
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 11),
        ("FONTNAME", (1, -2), (1, -1), "Helvetica-Bold"),
        ("FONTSIZE", (1, -2), (1, -1), 13),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ROWBACKGROUND", (0, -2), (-1, -1), colors.HexColor("#dbeafe")),
        ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#bfdbfe")),
        ("LINEBELOW", (0, 0), (-1, -2), 0.5, colors.HexColor("#e0f2fe")),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 20))

    # Transactions table
    story.append(Paragraph("Buchungen", section_style))
    headers = ["Datum", "Beschreibung", "Kategorie", "Betrag"]
    table_data = [headers]

    for t in transactions:
        amount = float(t.get("amount", 0))
        amount_str = f"{'+' if t.get('type') == 'income' else '-'}{abs(amount):.2f} €"
        table_data.append([
            str(t.get("transaction_date", "")),
            t.get("description", "")[:45],
            t.get("category", "-"),
            amount_str,
        ])

    col_widths = [3.5 * cm, 8 * cm, 3.5 * cm, 3.5 * cm]
    trans_table = Table(table_data, colWidths=col_widths, repeatRows=1)
    trans_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e40af")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 10),
        ("ALIGN", (0, 0), (-1, 0), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 1), (-1, -1), 9),
        ("ALIGN", (3, 1), (3, -1), "RIGHT"),
        ("ROWBACKGROUND", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
        ("LINEBELOW", (0, 0), (-1, -2), 0.3, colors.HexColor("#e2e8f0")),
        ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#cbd5e1")),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))

    # Color income/expense rows
    for i, t in enumerate(transactions, 1):
        if t.get("type") == "income":
            trans_table.setStyle(TableStyle([("TEXTCOLOR", (3, i), (3, i), colors.HexColor("#059669"))]))
        else:
            trans_table.setStyle(TableStyle([("TEXTCOLOR", (3, i), (3, i), colors.HexColor("#dc2626"))]))

    story.append(trans_table)
    story.append(Spacer(1, 20))

    # Footer
    footer_style = ParagraphStyle(
        "Footer",
        parent=styles["Normal"],
        fontSize=8,
        textColor=colors.HexColor("#9ca3af"),
        alignment=TA_CENTER,
    )
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#e5e7eb")))
    story.append(Spacer(1, 10))
    story.append(Paragraph(
        f"Erstellt mit VereinsKasse am {date.today().strftime('%d.%m.%Y')} | Jahresabschluss {year}",
        footer_style,
    ))

    doc.build(story)
    return buffer.getvalue()


def generate_payment_reminder_pdf(
    member_name: str,
    organization_name: str,
    amount: float,
    due_date: str,
    notes: str = "",
    address: str = "",
) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=2.5 * cm,
        leftMargin=2.5 * cm,
        topMargin=3 * cm,
        bottomMargin=2.5 * cm,
        title=f"Zahlungserinnerung - {member_name}",
    )

    styles = getSampleStyleSheet()

    story = []

    # Sender
    sender_style = ParagraphStyle("Sender", parent=styles["Normal"], fontSize=9, textColor=colors.HexColor("#6b7280"))
    story.append(Paragraph(organization_name, sender_style))
    story.append(Spacer(1, 20))

    # Recipient address
    addr_style = ParagraphStyle("Address", parent=styles["Normal"], fontSize=11)
    story.append(Paragraph(member_name, addr_style))
    if address:
        story.append(Paragraph(address, addr_style))
    story.append(Spacer(1, 30))

    # Date
    date_style = ParagraphStyle("Date", parent=styles["Normal"], fontSize=10, alignment=TA_RIGHT)
    story.append(Paragraph(date.today().strftime("%d. %B %Y"), date_style))
    story.append(Spacer(1, 20))

    # Subject
    subject_style = ParagraphStyle("Subject", parent=styles["Normal"], fontSize=12, fontName="Helvetica-Bold")
    story.append(Paragraph("Zahlungserinnerung", subject_style))
    story.append(Spacer(1, 20))

    # Body
    body_style = ParagraphStyle("Body", parent=styles["Normal"], fontSize=11, leading=18)
    story.append(Paragraph(f"Sehr geehrte/r {member_name},", body_style))
    story.append(Spacer(1, 12))
    story.append(Paragraph(
        "wir erlauben uns, Sie freundlich an folgenden ausstehenden Betrag zu erinnern:",
        body_style,
    ))
    story.append(Spacer(1, 20))

    # Amount box
    amount_data = [
        ["Offener Betrag:", f"{amount:.2f} €"],
        ["Fällig bis:", due_date],
    ]
    if notes:
        amount_data.append(["Hinweis:", notes])

    amount_table = Table(amount_data, colWidths=[6 * cm, 10 * cm])
    amount_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#fef3c7")),
        ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#fcd34d")),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (1, 0), (1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 11),
        ("FONTSIZE", (1, 0), (1, 0), 14),
        ("TEXTCOLOR", (1, 0), (1, 0), colors.HexColor("#92400e")),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("LEFTPADDING", (0, 0), (-1, -1), 15),
        ("LINEBELOW", (0, 0), (-1, -2), 0.5, colors.HexColor("#fcd34d")),
    ]))
    story.append(amount_table)
    story.append(Spacer(1, 20))

    story.append(Paragraph(
        "Bitte überweisen Sie den Betrag auf unser Vereinskonto. "
        "Falls Sie bereits gezahlt haben, bitten wir Sie, dieses Schreiben als gegenstandslos zu betrachten.",
        body_style,
    ))
    story.append(Spacer(1, 30))
    story.append(Paragraph("Mit freundlichen Grüßen,", body_style))
    story.append(Spacer(1, 8))
    story.append(Paragraph(f"<b>{organization_name}</b>", body_style))

    # Footer
    story.append(Spacer(1, 40))
    footer_style = ParagraphStyle("Footer", parent=styles["Normal"], fontSize=8, textColor=colors.HexColor("#9ca3af"), alignment=TA_CENTER)
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#e5e7eb")))
    story.append(Spacer(1, 8))
    story.append(Paragraph(f"Erstellt mit VereinsKasse | {date.today().strftime('%d.%m.%Y')}", footer_style))

    doc.build(story)
    return buffer.getvalue()
