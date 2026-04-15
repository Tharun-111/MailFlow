"""
PDF Service — Email Automation System
Generates professional PDFs: Offer Letters, Certificates, Task Sheets.
Uses ReportLab for production-quality output.
"""
import os
from datetime import date
from pathlib import Path
from django.conf import settings

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm, cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics


class PDFService:
    """
    Centralized PDF generation service.
    All PDFs are saved to settings.PDF_OUTPUT_DIR/{student_name}.pdf
    """

    PDF_DIR = settings.PDF_OUTPUT_DIR
    COMPANY_NAME = "TechAcademy Institute"
    COMPANY_TAGLINE = "Empowering Future Engineers"

    # Brand Colors
    PRIMARY = colors.HexColor('#1E3A5F')
    ACCENT = colors.HexColor('#E85D26')
    LIGHT_BG = colors.HexColor('#F8F9FA')
    GOLD = colors.HexColor('#D4AF37')

    def __init__(self):
        self.PDF_DIR.mkdir(parents=True, exist_ok=True)

    def _get_output_path(self, student_name: str, suffix: str = '') -> str:
        """Generate sanitized file path: {student_name}_{suffix}.pdf"""
        safe_name = "".join(c for c in student_name if c.isalnum() or c in (' ', '-', '_')).strip()
        safe_name = safe_name.replace(' ', '_')
        filename = f"{safe_name}{suffix}.pdf" if suffix else f"{safe_name}.pdf"
        return str(self.PDF_DIR / filename)

    def _base_styles(self):
        styles = getSampleStyleSheet()
        styles.add(ParagraphStyle(
            name='DocTitle',
            fontSize=24,
            fontName='Helvetica-Bold',
            textColor=self.PRIMARY,
            spaceAfter=6,
            alignment=TA_CENTER,
        ))
        styles.add(ParagraphStyle(
            name='CompanyName',
            fontSize=14,
            fontName='Helvetica-Bold',
            textColor=self.ACCENT,
            alignment=TA_CENTER,
        ))
        styles.add(ParagraphStyle(
            name='SubTitle',
            fontSize=12,
            fontName='Helvetica',
            textColor=colors.grey,
            alignment=TA_CENTER,
            spaceAfter=20,
        ))
        styles.add(ParagraphStyle(
            name='BodyText2',
            fontSize=11,
            fontName='Helvetica',
            textColor=colors.HexColor('#333333'),
            spaceAfter=12,
            leading=18,
            alignment=TA_JUSTIFY,
        ))
        styles.add(ParagraphStyle(
            name='FieldLabel',
            fontSize=10,
            fontName='Helvetica-Bold',
            textColor=self.PRIMARY,
        ))
        return styles

    def generate_offer_letter(self, student) -> str:
        """
        Generate a professional offer letter PDF.
        Returns the absolute path to the generated file.
        """
        output_path = self._get_output_path(student.name, '_offer_letter')
        styles = self._base_styles()
        doc = SimpleDocTemplate(
            output_path, pagesize=A4,
            leftMargin=2*cm, rightMargin=2*cm,
            topMargin=2*cm, bottomMargin=2*cm
        )

        story = []

        # Header
        story.append(Paragraph(self.COMPANY_NAME, styles['CompanyName']))
        story.append(Paragraph(self.COMPANY_TAGLINE, styles['SubTitle']))
        story.append(HRFlowable(width="100%", thickness=2, color=self.PRIMARY))
        story.append(Spacer(1, 0.3*inch))

        # Title
        story.append(Paragraph("OFFER LETTER", styles['DocTitle']))
        story.append(HRFlowable(width="50%", thickness=1, color=self.ACCENT))
        story.append(Spacer(1, 0.3*inch))

        # Date and reference
        today = date.today().strftime("%B %d, %Y")
        ref_no = f"OL/{date.today().year}/{student.id:04d}"

        info_data = [
            ['Date:', today, 'Ref No:', ref_no],
        ]
        info_table = Table(info_data, colWidths=[1.5*cm, 6*cm, 2*cm, 5*cm])
        info_table.setStyle(TableStyle([
            ('FONT', (0, 0), (-1, -1), 'Helvetica', 10),
            ('FONTNAME', (0, 0), (0, 0), 'Helvetica-Bold'),
            ('FONTNAME', (2, 0), (2, 0), 'Helvetica-Bold'),
            ('TEXTCOLOR', (0, 0), (-1, -1), self.PRIMARY),
        ]))
        story.append(info_table)
        story.append(Spacer(1, 0.2*inch))

        # Salutation
        story.append(Paragraph(f"Dear <b>{student.name}</b>,", styles['BodyText2']))
        story.append(Spacer(1, 0.1*inch))

        # Body
        body = f"""
        We are delighted to inform you that following your excellent performance in our assessment 
        process, <b>{self.COMPANY_NAME}</b> is pleased to offer you admission to the 
        <b>{student.course or 'Full Stack Development'}</b> program under Batch <b>{student.batch or 'Current'}</b>.
        """
        story.append(Paragraph(body, styles['BodyText2']))

        # Details table
        story.append(Spacer(1, 0.2*inch))
        story.append(Paragraph("Program Details:", styles['FieldLabel']))
        story.append(Spacer(1, 0.1*inch))

        details = [
            ['Student Name', student.name],
            ['Email Address', student.email],
            ['Program / Course', student.course or 'Full Stack Development'],
            ['Batch', student.batch or 'Current Batch'],
            ['Mentor', student.mentor or 'To be Assigned'],
            ['Start Date', today],
        ]
        detail_table = Table(details, colWidths=[5*cm, 12*cm])
        detail_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), self.LIGHT_BG),
            ('TEXTCOLOR', (0, 0), (0, -1), self.PRIMARY),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('ROWBACKGROUNDS', (0, 0), (-1, -1), [colors.white, self.LIGHT_BG]),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#DDDDDD')),
            ('PADDING', (0, 0), (-1, -1), 8),
        ]))
        story.append(detail_table)
        story.append(Spacer(1, 0.3*inch))

        closing = """
        We look forward to your positive response. Please confirm your acceptance within 
        <b>7 days</b> of receiving this letter by replying to this email.
        <br/><br/>
        Congratulations once again, and we wish you a successful journey ahead!
        """
        story.append(Paragraph(closing, styles['BodyText2']))
        story.append(Spacer(1, 0.5*inch))

        # Signature block
        sig_data = [
            ['', ''],
            ['____________________', '____________________'],
            ['Authorized Signatory', f'{student.name}'],
            [self.COMPANY_NAME, 'Student Signature'],
        ]
        sig_table = Table(sig_data, colWidths=[9*cm, 9*cm])
        sig_table.setStyle(TableStyle([
            ('FONTNAME', (0, 1), (-1, 1), 'Helvetica'),
            ('FONTNAME', (0, 2), (-1, 2), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('TEXTCOLOR', (0, 2), (-1, 2), self.PRIMARY),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ]))
        story.append(sig_table)

        doc.build(story)
        return output_path

    def generate_certificate(self, student) -> str:
        """Generate a completion certificate PDF."""
        output_path = self._get_output_path(student.name, '_certificate')

        c = canvas.Canvas(output_path, pagesize=A4)
        width, height = A4

        # Background
        c.setFillColor(self.LIGHT_BG)
        c.rect(0, 0, width, height, fill=1, stroke=0)

        # Decorative border
        c.setStrokeColor(self.PRIMARY)
        c.setLineWidth(4)
        c.rect(20, 20, width-40, height-40, fill=0, stroke=1)
        c.setStrokeColor(self.ACCENT)
        c.setLineWidth(1.5)
        c.rect(28, 28, width-56, height-56, fill=0, stroke=1)

        # Gold corner decorations
        for x, y in [(20, height-20), (width-20, height-20), (20, 20), (width-20, 20)]:
            c.setFillColor(self.GOLD)
            c.circle(x, y, 6, fill=1)

        # Header
        c.setFillColor(self.PRIMARY)
        c.setFont("Helvetica-Bold", 14)
        c.drawCentredString(width/2, height - 90, self.COMPANY_NAME.upper())

        c.setFillColor(self.ACCENT)
        c.setFont("Helvetica", 11)
        c.drawCentredString(width/2, height - 110, self.COMPANY_TAGLINE)

        # Divider
        c.setStrokeColor(self.GOLD)
        c.setLineWidth(2)
        c.line(80, height-125, width-80, height-125)

        # Certificate Title
        c.setFillColor(self.PRIMARY)
        c.setFont("Helvetica-Bold", 32)
        c.drawCentredString(width/2, height - 185, "CERTIFICATE")
        c.setFont("Helvetica", 18)
        c.drawCentredString(width/2, height - 210, "OF COMPLETION")

        # Body
        c.setFillColor(colors.HexColor('#555555'))
        c.setFont("Helvetica", 12)
        c.drawCentredString(width/2, height - 260, "This is to certify that")

        # Student Name
        c.setFillColor(self.ACCENT)
        c.setFont("Helvetica-Bold", 28)
        c.drawCentredString(width/2, height - 300, student.name)

        # Underline
        name_width = c.stringWidth(student.name, "Helvetica-Bold", 28)
        c.setStrokeColor(self.ACCENT)
        c.setLineWidth(1)
        c.line(width/2 - name_width/2, height-305, width/2 + name_width/2, height-305)

        # Course info
        c.setFillColor(colors.HexColor('#555555'))
        c.setFont("Helvetica", 12)
        c.drawCentredString(width/2, height - 340,
            f"has successfully completed the program in")

        c.setFillColor(self.PRIMARY)
        c.setFont("Helvetica-Bold", 14)
        c.drawCentredString(width/2, height - 365, student.course or "Full Stack Development")

        if student.review_score:
            c.setFont("Helvetica", 12)
            c.setFillColor(colors.HexColor('#555555'))
            c.drawCentredString(width/2, height - 395,
                f"with a score of {student.review_score}%")

        # Date and Seal area
        c.setFillColor(colors.HexColor('#555555'))
        c.setFont("Helvetica", 11)
        today = date.today().strftime("%B %d, %Y")
        c.drawString(80, 140, f"Date: {today}")
        c.drawRightString(width-80, 140, f"Batch: {student.batch or 'Current'}")

        # Signature line
        c.setStrokeColor(self.PRIMARY)
        c.line(80, 115, 220, 115)
        c.line(width-220, 115, width-80, 115)
        c.setFont("Helvetica-Bold", 10)
        c.setFillColor(self.PRIMARY)
        c.drawCentredString(150, 100, "Program Director")
        c.drawCentredString(width-150, 100, "Academic Dean")

        c.save()
        return output_path

    def generate_task_sheet(self, student) -> str:
        """Generate a task allocation sheet PDF."""
        output_path = self._get_output_path(student.name, '_task_sheet')
        styles = self._base_styles()
        doc = SimpleDocTemplate(
            output_path, pagesize=A4,
            leftMargin=2*cm, rightMargin=2*cm,
            topMargin=2*cm, bottomMargin=2*cm
        )

        story = []

        story.append(Paragraph(self.COMPANY_NAME, styles['CompanyName']))
        story.append(Paragraph("Task Allocation Sheet", styles['DocTitle']))
        story.append(HRFlowable(width="100%", thickness=2, color=self.PRIMARY))
        story.append(Spacer(1, 0.3*inch))

        # Student info
        info = [
            ['Student:', student.name, 'Date:', date.today().strftime("%B %d, %Y")],
            ['Email:', student.email, 'Batch:', student.batch or 'Current'],
            ['Mentor:', student.mentor or 'TBD', 'Due Date:', str(student.task_due_date or 'TBD')],
        ]
        t = Table(info, colWidths=[2.5*cm, 8*cm, 2.5*cm, 5*cm])
        t.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('TEXTCOLOR', (0, 0), (0, -1), self.PRIMARY),
            ('TEXTCOLOR', (2, 0), (2, -1), self.PRIMARY),
            ('ROWBACKGROUNDS', (0, 0), (-1, -1), [colors.white, self.LIGHT_BG]),
            ('PADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(t)
        story.append(Spacer(1, 0.3*inch))

        # Task title
        story.append(Paragraph(f"Task: {student.task_title or 'Assigned Task'}", styles['FieldLabel']))
        story.append(Spacer(1, 0.1*inch))

        # Task description
        desc = student.task_description or "Complete the assigned task as per the guidelines provided by your mentor. Ensure quality and timely submission."
        story.append(Paragraph(desc, styles['BodyText2']))
        story.append(Spacer(1, 0.3*inch))

        # Deliverables table
        story.append(Paragraph("Expected Deliverables:", styles['FieldLabel']))
        story.append(Spacer(1, 0.1*inch))
        deliverables = [
            ['#', 'Deliverable', 'Expected By', 'Status'],
            ['1', 'Initial Research & Planning', 'Day 2', '☐'],
            ['2', 'Implementation / Coding', 'Day 5', '☐'],
            ['3', 'Testing & Documentation', 'Day 7', '☐'],
            ['4', 'Final Submission', str(student.task_due_date or 'TBD'), '☐'],
        ]
        dt = Table(deliverables, colWidths=[1*cm, 9*cm, 5*cm, 2*cm])
        dt.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), self.PRIMARY),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, self.LIGHT_BG]),
            ('PADDING', (0, 0), (-1, -1), 8),
            ('ALIGN', (0, 0), (0, -1), 'CENTER'),
            ('ALIGN', (3, 0), (3, -1), 'CENTER'),
        ]))
        story.append(dt)

        doc.build(story)
        return output_path


# Singleton instance
pdf_service = PDFService()
