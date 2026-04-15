"""
Email Service — Email Automation System
Core email sending logic with template rendering, AI features, and tracking.
"""
import logging
from django.core.mail import EmailMessage
from django.conf import settings

from .models import EmailTemplate, EmailLog
from .pdf_service import pdf_service

logger = logging.getLogger(__name__)


class AIEmailService:
    """
    Integrates with Anthropic Claude API to:
    - Auto-generate feedback text
    - Suggest improved email templates
    - Detect email tone
    - Recommend scheduling
    """

    def __init__(self):
        self.client = None
        if settings.ANTHROPIC_API_KEY:
            try:
                import anthropic
                self.client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
            except Exception as e:
                logger.warning(f"Anthropic client init failed: {e}")

    def generate_feedback(self, student) -> str:
        """Auto-generate personalized feedback for a student."""
        if not self.client:
            return self._fallback_feedback(student)

        prompt = f"""
        Generate a professional, encouraging performance feedback paragraph for a student with these details:
        - Name: {student.name}
        - Course: {student.course or 'Full Stack Development'}
        - Review Score: {student.review_score or 'Not yet scored'}
        - Current Status: {student.status}
        
        Write 2-3 sentences. Be specific, constructive, and motivating. 
        Do NOT use generic phrases. Return only the feedback text.
        """
        try:
            message = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=200,
                messages=[{"role": "user", "content": prompt}]
            )
            return message.content[0].text.strip()
        except Exception as e:
            logger.error(f"AI feedback generation failed: {e}")
            return self._fallback_feedback(student)

    def suggest_template_improvement(self, template_body: str) -> str:
        """Suggest an improved version of an email template."""
        if not self.client:
            return template_body

        prompt = f"""
        Improve this email template to be more professional, engaging, and clear.
        Keep all placeholders ({{name}}, {{date}}, etc.) intact.
        Make it concise and action-oriented.
        Return only the improved template body text.
        
        Original template:
        {template_body}
        """
        try:
            message = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=500,
                messages=[{"role": "user", "content": prompt}]
            )
            return message.content[0].text.strip()
        except Exception as e:
            logger.error(f"AI template improvement failed: {e}")
            return template_body

    def detect_tone(self, text: str) -> str:
        """Detect the tone of an email (formal/informal/friendly)."""
        if not self.client:
            return 'formal'

        prompt = f"""
        Analyze the tone of this email text. 
        Reply with ONLY one word: formal, informal, or friendly.
        
        Text: {text[:500]}
        """
        try:
            message = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=10,
                messages=[{"role": "user", "content": prompt}]
            )
            tone = message.content[0].text.strip().lower()
            if tone in ['formal', 'informal', 'friendly']:
                return tone
            return 'formal'
        except Exception:
            return 'formal'

    def recommend_send_time(self, email_type: str) -> str:
        """AI recommendation for optimal send time."""
        recommendations = {
            'review_feedback': 'Tuesday or Wednesday, 10 AM — highest open rates mid-week morning',
            'weekly_schedule': 'Sunday 8 AM — sets the week agenda before Monday rush',
            'offer_letter': 'Monday 9 AM — professional start of week, high attention',
            'certificate': 'Friday 4 PM — celebratory end-of-week moment',
            'first_review': 'Monday 9 AM — fresh week, fresh start',
            'task_allocation': 'Monday 8 AM — task planning at week start',
            'review_reminder': '2 days before review, 9 AM — optimal reminder window',
            'hold': 'Tuesday 10 AM — mid-week for professional communication',
        }
        return recommendations.get(email_type, 'Tuesday or Wednesday, 10 AM')

    def _fallback_feedback(self, student) -> str:
        score_text = f"achieving a score of {student.review_score}%" if student.review_score else "your consistent effort"
        return (
            f"Dear {student.name}, your performance in {student.course or 'the program'} "
            f"has been evaluated. We appreciate {score_text} and encourage you to continue "
            "building on your strengths while working on the areas highlighted for improvement."
        )


class EmailSendingService:
    """
    Core email sending service.
    Handles template rendering, PDF attachment, and log creation.
    """

    def __init__(self):
        self.ai_service = AIEmailService()

    def send_email(
        self,
        student,
        email_type: str,
        extra_context: dict = None,
        attach_pdf: str = None,  # 'offer_letter' | 'certificate' | 'task_sheet'
        log_id: int = None,
    ) -> tuple[bool, str]:
        """
        Send a single email to a student.
        Returns (success: bool, message: str)
        """
        log = None

        try:
            # Get template
            template = EmailTemplate.objects.get(type=email_type, is_active=True)
        except EmailTemplate.DoesNotExist:
            return False, f"No active template found for type: {email_type}"

        # Build rendering context
        context = self._build_context(student, extra_context or {})

        # If no feedback provided, try AI generation
        if not context.get('feedback') and email_type in ['review_feedback', 'first_review']:
            context['feedback'] = self.ai_service.generate_feedback(student)

        # Render subject and body
        subject, body = template.render(context)

        # Find or create log
        if log_id:
            log = EmailLog.objects.get(id=log_id)
        else:
            log = EmailLog.objects.create(
                student=student,
                email_type=email_type,
                recipient_email=student.email,
                subject=subject,
                body_preview=body[:500],
                has_attachment=bool(attach_pdf),
            )

        # Generate PDF if needed
        pdf_path = None
        if attach_pdf or template.has_pdf_attachment:
            pdf_type = attach_pdf or self._get_pdf_type(email_type)
            pdf_path = self._generate_pdf(student, pdf_type)
            if pdf_path:
                log.attachment_path = pdf_path
                log.has_attachment = True
                log.save(update_fields=['attachment_path', 'has_attachment'])

        # Send the email
        try:
            email_msg = EmailMessage(
                subject=subject,
                body=body,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[student.email],
            )
            email_msg.content_subtype = 'html'

            if pdf_path and pdf_path != 'error':
                import os
                if os.path.exists(pdf_path):
                    with open(pdf_path, 'rb') as f:
                        filename = os.path.basename(pdf_path)
                        email_msg.attach(filename, f.read(), 'application/pdf')

            email_msg.send(fail_silently=False)
            log.mark_sent()
            return True, f"Email sent successfully to {student.email}"

        except Exception as e:
            error_msg = str(e)
            log.mark_failed(error_msg)
            logger.error(f"Email send failed for {student.email}: {error_msg}")
            return False, error_msg

    def send_bulk_emails(
        self,
        students,
        email_type: str,
        extra_context: dict = None,
    ) -> dict:
        """Send emails to multiple students. Returns summary dict."""
        results = {'sent': 0, 'failed': 0, 'errors': []}
        for student in students:
            success, message = self.send_email(student, email_type, extra_context)
            if success:
                results['sent'] += 1
            else:
                results['failed'] += 1
                results['errors'].append({'student': student.name, 'error': message})
        return results

    def _build_context(self, student, extra: dict) -> dict:
        from django.utils import timezone
        return {
            'name': student.name,
            'email': student.email,
            'course': student.course or '',
            'batch': student.batch or '',
            'mentor': student.mentor or '',
            'date': timezone.now().strftime('%B %d, %Y'),
            'review_date': str(student.review_date) if student.review_date else '',
            'feedback': student.feedback or student.ai_feedback or '',
            'task_title': student.task_title or '',
            'task_description': student.task_description or '',
            'task_due_date': str(student.task_due_date) if student.task_due_date else '',
            'review_score': str(student.review_score) if student.review_score else '',
            'status': student.status,
            **extra,
        }

    def _get_pdf_type(self, email_type: str) -> str:
        mapping = {
            'offer_letter': 'offer_letter',
            'certificate': 'certificate',
            'task_allocation': 'task_sheet',
        }
        return mapping.get(email_type, '')

    def _generate_pdf(self, student, pdf_type: str) -> str:
        try:
            if pdf_type == 'offer_letter':
                return pdf_service.generate_offer_letter(student)
            elif pdf_type == 'certificate':
                return pdf_service.generate_certificate(student)
            elif pdf_type == 'task_sheet':
                return pdf_service.generate_task_sheet(student)
        except Exception as e:
            logger.error(f"PDF generation failed: {e}")
            return 'error'
        return ''


# Singletons
ai_email_service = AIEmailService()
email_sending_service = EmailSendingService()
