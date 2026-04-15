"""
Emails Models — Email Automation System
EmailTemplate and EmailLog models with full tracking.
"""
from django.db import models
from django.utils import timezone
from students.models import Student


class EmailTemplate(models.Model):
    """
    Reusable email templates with dynamic placeholder support.
    Placeholders: {{name}}, {{date}}, {{feedback}}, {{course}}, etc.
    """

    class EmailType(models.TextChoices):
        REVIEW_FEEDBACK = 'review_feedback', 'Review Feedback Mail'
        WEEKLY_SCHEDULE = 'weekly_schedule', 'Weekly Schedule Mail'
        OFFER_LETTER = 'offer_letter', 'Offer Letter Mail'
        CERTIFICATE = 'certificate', 'Certificate Mail'
        FIRST_REVIEW = 'first_review', 'First Review Mail'
        TASK_ALLOCATION = 'task_allocation', 'Task Allocation Mail'
        REVIEW_REMINDER = 'review_reminder', 'Review Reminder Mail'
        HOLD = 'hold', 'Hold Mail'

    type = models.CharField(max_length=50, choices=EmailType.choices, unique=True)
    name = models.CharField(max_length=200)
    subject = models.CharField(max_length=500)
    body = models.TextField(help_text="Use {{name}}, {{date}}, {{feedback}}, {{course}} as placeholders")

    # AI improvement tracking
    ai_suggested_body = models.TextField(blank=True)
    tone = models.CharField(
        max_length=20,
        choices=[('formal', 'Formal'), ('informal', 'Informal'), ('friendly', 'Friendly')],
        default='formal'
    )

    has_pdf_attachment = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['type']

    def __str__(self):
        return f"{self.name} ({self.type})"

    def render(self, context: dict) -> tuple[str, str]:
        """
        Renders subject and body with the given context dictionary.
        Returns (rendered_subject, rendered_body).
        """
        subject = self.subject
        body = self.body
        for key, value in context.items():
            placeholder = f"{{{{{key}}}}}"
            subject = subject.replace(placeholder, str(value) if value else '')
            body = body.replace(placeholder, str(value) if value else '')
        return subject, body


class EmailLog(models.Model):
    """
    Tracks every email sent or attempted by the system.
    Used for admin analytics and retry logic.
    """

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        SENT = 'sent', 'Sent'
        FAILED = 'failed', 'Failed'
        RETRYING = 'retrying', 'Retrying'

    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='email_logs')
    email_type = models.CharField(max_length=50, choices=EmailTemplate.EmailType.choices)
    recipient_email = models.EmailField()
    subject = models.CharField(max_length=500)
    body_preview = models.TextField(blank=True)  # First 500 chars for preview

    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    error_message = models.TextField(blank=True)

    has_attachment = models.BooleanField(default=False)
    attachment_path = models.CharField(max_length=500, blank=True)

    retry_count = models.IntegerField(default=0)
    max_retries = models.IntegerField(default=3)

    # Celery task tracking
    task_id = models.CharField(max_length=200, blank=True)

    sent_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['email_type']),
            models.Index(fields=['student', 'email_type']),
        ]

    def __str__(self):
        return f"{self.email_type} → {self.recipient_email} [{self.status}]"

    def mark_sent(self):
        self.status = self.Status.SENT
        self.sent_at = timezone.now()
        self.save(update_fields=['status', 'sent_at', 'updated_at'])

    def mark_failed(self, error: str):
        self.status = self.Status.FAILED
        self.error_message = error
        self.retry_count += 1
        self.save(update_fields=['status', 'error_message', 'retry_count', 'updated_at'])

    @property
    def can_retry(self):
        return self.retry_count < self.max_retries and self.status == self.Status.FAILED
