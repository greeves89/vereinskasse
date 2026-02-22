from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, HRFlowable
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT, TA_JUSTIFY
from io import BytesIO
from typing import List, Dict, Any, Optional
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


def generate_zuwendungsbestaetigung_pdf(
    organization_name: str,
    member_name: str,
    member_address: Optional[str],
    year: int,
    total_amount: float,
    transactions: List[Dict[str, Any]],
    issue_date: date,
) -> bytes:
    """
    Generiert eine Zuwendungsbestätigung (Spendenquittung) nach amtlichem Muster
    gem. § 10b EStG und Anlage zu §§ 50, 63 EStDV.
    """
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=2.5 * cm,
        leftMargin=2.5 * cm,
        topMargin=2 * cm,
        bottomMargin=2.5 * cm,
        title=f"Zuwendungsbestätigung {year} - {member_name}",
    )

    styles = getSampleStyleSheet()
    bold_center = ParagraphStyle("BoldCenter", parent=styles["Normal"], fontSize=14, fontName="Helvetica-Bold", alignment=TA_CENTER, spaceAfter=4)
    center_sm = ParagraphStyle("CenterSm", parent=styles["Normal"], fontSize=10, alignment=TA_CENTER, textColor=colors.HexColor("#6b7280"), spaceAfter=16)
    heading = ParagraphStyle("Heading", parent=styles["Normal"], fontSize=11, fontName="Helvetica-Bold", spaceBefore=12, spaceAfter=4)
    normal = ParagraphStyle("Norm", parent=styles["Normal"], fontSize=10, leading=16)
    small = ParagraphStyle("Small", parent=styles["Normal"], fontSize=8, textColor=colors.HexColor("#6b7280"), leading=12)
    justified = ParagraphStyle("Just", parent=styles["Normal"], fontSize=10, leading=16, alignment=TA_JUSTIFY)
    right_sm = ParagraphStyle("RightSm", parent=styles["Normal"], fontSize=10, alignment=TA_RIGHT)

    story = []

    # Title block
    story.append(Paragraph("ZUWENDUNGSBESTÄTIGUNG", bold_center))
    story.append(Paragraph("nach amtlichem Muster gem. § 10b EStG", center_sm))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#1e40af")))
    story.append(Spacer(1, 16))

    # Aussteller block
    story.append(Paragraph("Aussteller (Zuwendungsempfänger):", heading))
    aussteller_data = [
        ["Name / Organisation:", organization_name],
        ["Steuernummer:", "___________________________"],
        ["Finanzamt:", "___________________________"],
        ["Freistellungsbescheid vom:", "___________________________"],
    ]
    aussteller_table = Table(aussteller_data, colWidths=[6 * cm, 11 * cm])
    aussteller_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LINEBELOW", (0, 0), (-1, -2), 0.3, colors.HexColor("#e5e7eb")),
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f0f9ff")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#bfdbfe")),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(aussteller_table)
    story.append(Spacer(1, 16))

    # Zuwendender (donor)
    story.append(Paragraph("Zuwendender (Spender / Mitglied):", heading))
    donor_data = [
        ["Name:", member_name],
        ["Adresse:", member_address or "___________________________"],
    ]
    donor_table = Table(donor_data, colWidths=[4 * cm, 13 * cm])
    donor_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LINEBELOW", (0, 0), (-1, -2), 0.3, colors.HexColor("#e5e7eb")),
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(donor_table)
    story.append(Spacer(1, 16))

    # Zuwendungsbetrag (amount)
    story.append(Paragraph("Art und Höhe der Zuwendung:", heading))
    amount_data = [
        ["Gesamtbetrag:", f"{total_amount:.2f} €", "Zeitraum:", f"01.01.{year} – 31.12.{year}"],
        ["In Worten:", _amount_in_words(total_amount), "", ""],
        ["Art:", "Mitgliedsbeiträge / Geldzuwendung", "", ""],
    ]
    amount_table = Table(amount_data, colWidths=[3.5 * cm, 6 * cm, 2.5 * cm, 5 * cm])
    amount_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (2, 0), (2, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("FONTNAME", (1, 0), (1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (1, 0), (1, 0), 13),
        ("TEXTCOLOR", (1, 0), (1, 0), colors.HexColor("#1e40af")),
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#eff6ff")),
        ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#bfdbfe")),
        ("SPAN", (1, 1), (3, 1)),
        ("SPAN", (1, 2), (3, 2)),
        ("LINEBELOW", (0, 0), (-1, -2), 0.3, colors.HexColor("#dbeafe")),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(amount_table)
    story.append(Spacer(1, 12))

    # Einzelbuchungen
    if transactions:
        story.append(Paragraph("Einzelne Zahlungseingänge:", heading))
        tx_data = [["Datum", "Verwendungszweck", "Betrag"]]
        for tx in transactions:
            tx_data.append([
                tx["date"].strftime("%d.%m.%Y") if hasattr(tx["date"], "strftime") else str(tx["date"]),
                str(tx["description"])[:50],
                f"{tx['amount']:.2f} €",
            ])
        tx_table = Table(tx_data, colWidths=[3.5 * cm, 11 * cm, 3 * cm], repeatRows=1)
        tx_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e40af")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("ALIGN", (2, 0), (2, -1), "RIGHT"),
            ("ROWBACKGROUND", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
            ("LINEBELOW", (0, 0), (-1, -2), 0.3, colors.HexColor("#e2e8f0")),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ]))
        story.append(tx_table)
        story.append(Spacer(1, 16))

    # Bestätigungstext
    story.append(Paragraph("Bestätigung:", heading))
    story.append(Paragraph(
        f"Wir bestätigen, dass die Zuwendung nur für satzungsmäßige Zwecke verwendet wird. "
        f"Es handelt sich nicht um einen Verzicht auf Erstattung von Aufwendungen. "
        f"Die Zuwendung wurde im Veranlagungszeitraum {year} geleistet. "
        f"Der Verein ist durch Freistellungsbescheid des zuständigen Finanzamts von der Körperschaftsteuer befreit "
        f"und wird als gemeinnützig anerkannt.",
        justified,
    ))
    story.append(Spacer(1, 16))

    # Steuerhinweis
    story.append(Paragraph(
        "Hinweis: Nur Zuwendungen bis zu 300 € können mit diesem vereinfachten Zuwendungsnachweis "
        "(Buchungsbestätigung) steuerlich geltend gemacht werden. Bei Beträgen über 300 € ist diese "
        "Bestätigung in Verbindung mit dem Kontoauszug vorzulegen.",
        small,
    ))
    story.append(Spacer(1, 20))

    # Signature block
    story.append(Paragraph(f"Ort, Datum: ___________________, {issue_date.strftime('%d.%m.%Y')}", right_sm))
    story.append(Spacer(1, 30))
    sig_data = [
        ["___________________________", "___________________________"],
        ["Ort, Datum / Unterschrift", "Stempel des Vereins"],
    ]
    sig_table = Table(sig_data, colWidths=[8.5 * cm, 8.5 * cm])
    sig_table.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("TEXTCOLOR", (0, 1), (-1, 1), colors.HexColor("#6b7280")),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(sig_table)

    # Footer
    story.append(Spacer(1, 20))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#e5e7eb")))
    footer_style = ParagraphStyle("Footer", parent=styles["Normal"], fontSize=7, textColor=colors.HexColor("#9ca3af"), alignment=TA_CENTER, spaceBefore=6)
    story.append(Paragraph(
        f"Erstellt mit VereinsKasse am {issue_date.strftime('%d.%m.%Y')} | "
        "Aufbewahrungspflicht: 10 Jahre | §§ 50, 63 EStDV",
        footer_style,
    ))

    doc.build(story)
    return buffer.getvalue()


def _amount_in_words(amount: float) -> str:
    """Simple German number-to-words for amounts up to 9999 €."""
    ones = ["", "ein", "zwei", "drei", "vier", "fünf", "sechs", "sieben", "acht", "neun",
            "zehn", "elf", "zwölf", "dreizehn", "vierzehn", "fünfzehn", "sechzehn",
            "siebzehn", "achtzehn", "neunzehn"]
    tens = ["", "", "zwanzig", "dreißig", "vierzig", "fünfzig", "sechzig", "siebzig", "achtzig", "neunzig"]

    euros = int(amount)
    cents = round((amount - euros) * 100)

    def _hundreds(n: int) -> str:
        if n == 0:
            return ""
        elif n < 20:
            return ones[n]
        elif n < 100:
            unit = ones[n % 10]
            ten = tens[n // 10]
            return (unit + "und" + ten) if unit else ten
        else:
            h = ones[n // 100] + "hundert"
            rest = _hundreds(n % 100)
            return h + rest

    def _full(n: int) -> str:
        if n == 0:
            return "null"
        elif n < 1000:
            return _hundreds(n)
        elif n < 10000:
            t = ones[n // 1000] + "tausend"
            rest = _hundreds(n % 1000)
            return t + rest
        return str(n)

    euro_str = _full(euros).capitalize() + " Euro"
    if cents:
        cent_str = _full(cents) + " Cent"
        return f"{euro_str} und {cent_str}"
    return euro_str


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
