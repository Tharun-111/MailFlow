"""
Management command: Seed default email templates.
Run: python manage.py seed_templates
"""
from django.core.management.base import BaseCommand
from emails.models import EmailTemplate


TEMPLATES = [
    {
        'type': 'review_feedback',
        'name': 'Review Feedback Mail',
        'subject': 'Your Performance Review Feedback — {{name}}',
        'body': '''<p>Dear <strong>{{name}}</strong>,</p>
<p>We have completed your performance review for the <strong>{{course}}</strong> program (Batch: {{batch}}).</p>
<p><strong>Review Date:</strong> {{review_date}}<br>
<strong>Score:</strong> {{review_score}}%</p>
<p><strong>Feedback:</strong><br>{{feedback}}</p>
<p>We encourage you to continue working on the highlighted areas. Your mentor <strong>{{mentor}}</strong> will schedule a follow-up session shortly.</p>
<p>Best regards,<br>The TechAcademy Team</p>''',
        'has_pdf_attachment': False,
    },
    {
        'type': 'weekly_schedule',
        'name': 'Weekly Schedule Mail',
        'subject': 'Your Weekly Schedule — Week of {{date}}',
        'body': '''<p>Hi <strong>{{name}}</strong>,</p>
<p>Here is your schedule for the upcoming week in the <strong>{{course}}</strong> program.</p>
<p>Your assigned mentor for this week is <strong>{{mentor}}</strong>.</p>
<ul>
<li>Monday: Morning standup at 9 AM</li>
<li>Wednesday: Mid-week review session</li>
<li>Friday: Weekly deliverable submission deadline</li>
</ul>
<p>Please ensure all tasks are completed on time. Reach out to your mentor if you need support.</p>
<p>Have a productive week!<br>The TechAcademy Team</p>''',
        'has_pdf_attachment': False,
    },
    {
        'type': 'offer_letter',
        'name': 'Offer Letter Mail',
        'subject': 'Congratulations! Your Offer Letter — {{name}}',
        'body': '''<p>Dear <strong>{{name}}</strong>,</p>
<p>🎉 Congratulations! We are thrilled to extend this offer to you for the <strong>{{course}}</strong> program.</p>
<p>Please find your official Offer Letter attached to this email as a PDF document.</p>
<p><strong>Key Details:</strong></p>
<ul>
<li><strong>Program:</strong> {{course}}</li>
<li><strong>Batch:</strong> {{batch}}</li>
<li><strong>Mentor:</strong> {{mentor}}</li>
<li><strong>Date:</strong> {{date}}</li>
</ul>
<p>Please sign and return the offer letter within 7 days to confirm your acceptance.</p>
<p>Welcome aboard! We look forward to an incredible journey together.</p>
<p>Warm regards,<br>The TechAcademy Admissions Team</p>''',
        'has_pdf_attachment': True,
    },
    {
        'type': 'certificate',
        'name': 'Certificate Mail',
        'subject': '🏆 Your Certificate of Completion — {{name}}',
        'body': '''<p>Dear <strong>{{name}}</strong>,</p>
<p>Congratulations on successfully completing the <strong>{{course}}</strong> program!</p>
<p>Your official Certificate of Completion is attached to this email. This certificate recognizes your dedication, hard work, and the skills you have developed throughout the program.</p>
<p><strong>Program:</strong> {{course}}<br>
<strong>Batch:</strong> {{batch}}<br>
<strong>Completion Date:</strong> {{date}}</p>
<p>We are proud of your achievement and wish you the very best in your future endeavors. Do stay in touch with us!</p>
<p>With best wishes,<br>The TechAcademy Team</p>''',
        'has_pdf_attachment': True,
    },
    {
        'type': 'first_review',
        'name': 'First Review Mail',
        'subject': 'Your First Review is Scheduled — {{name}}',
        'body': '''<p>Dear <strong>{{name}}</strong>,</p>
<p>Welcome to your first performance review at <strong>TechAcademy</strong>!</p>
<p>Your first review has been scheduled for <strong>{{review_date}}</strong>. This is a great opportunity to showcase what you have learned and discuss your progress with your mentor.</p>
<p><strong>What to expect:</strong></p>
<ul>
<li>A 30-minute session with your mentor <strong>{{mentor}}</strong></li>
<li>Review of your assignments and projects</li>
<li>Discussion on areas of strength and improvement</li>
<li>Goal-setting for the next phase</li>
</ul>
<p>Please come prepared with any questions you may have. We look forward to seeing your progress!</p>
<p>Best,<br>The TechAcademy Team</p>''',
        'has_pdf_attachment': False,
    },
    {
        'type': 'task_allocation',
        'name': 'Task Allocation Mail',
        'subject': 'New Task Assigned: {{task_title}} — {{name}}',
        'body': '''<p>Dear <strong>{{name}}</strong>,</p>
<p>A new task has been assigned to you. Please review the Task Sheet attached to this email.</p>
<p><strong>Task:</strong> {{task_title}}<br>
<strong>Due Date:</strong> {{task_due_date}}<br>
<strong>Assigned By:</strong> {{mentor}}</p>
<p><strong>Description:</strong><br>{{task_description}}</p>
<p>Please ensure that you complete the task by the due date and submit it through the portal. If you have any questions, reach out to your mentor directly.</p>
<p>Good luck!<br>The TechAcademy Team</p>''',
        'has_pdf_attachment': True,
    },
    {
        'type': 'review_reminder',
        'name': 'Review Reminder Mail',
        'subject': '⏰ Reminder: Your Review is Coming Up — {{name}}',
        'body': '''<p>Dear <strong>{{name}}</strong>,</p>
<p>This is a friendly reminder that your performance review is scheduled on <strong>{{review_date}}</strong>.</p>
<p>To make the most of your review session with <strong>{{mentor}}</strong>, we recommend:</p>
<ul>
<li>✅ Reviewing your recent assignments and projects</li>
<li>✅ Preparing questions for your mentor</li>
<li>✅ Reflecting on your progress and goals</li>
<li>✅ Being on time for the session</li>
</ul>
<p>Looking forward to a productive review session!</p>
<p>Best,<br>The TechAcademy Team</p>''',
        'has_pdf_attachment': False,
    },
    {
        'type': 'hold',
        'name': 'Hold Mail',
        'subject': 'Important Update Regarding Your Status — {{name}}',
        'body': '''<p>Dear <strong>{{name}}</strong>,</p>
<p>We are writing to inform you that your enrollment in the <strong>{{course}}</strong> program has been temporarily placed on hold as of <strong>{{date}}</strong>.</p>
<p>This decision has been made after careful consideration of your recent performance and attendance. We understand this may be unexpected and we want to assure you that this is a temporary measure.</p>
<p><strong>Next Steps:</strong></p>
<ul>
<li>Your mentor <strong>{{mentor}}</strong> will contact you within 48 hours</li>
<li>A counseling session will be scheduled to discuss the path forward</li>
<li>You will be provided a plan to resume your program</li>
</ul>
<p>Please do not hesitate to reach out to us if you have any questions or concerns. We are here to support you.</p>
<p>Regards,<br>The TechAcademy Administration Team</p>''',
        'has_pdf_attachment': False,
    },
]


class Command(BaseCommand):
    help = 'Seed default email templates into the database'

    def handle(self, *args, **options):
        created = 0
        updated = 0
        for tpl in TEMPLATES:
            obj, was_created = EmailTemplate.objects.update_or_create(
                type=tpl['type'],
                defaults=tpl
            )
            if was_created:
                created += 1
                self.stdout.write(self.style.SUCCESS(f'  ✅ Created: {tpl["name"]}'))
            else:
                updated += 1
                self.stdout.write(f'  ↺ Updated: {tpl["name"]}')

        self.stdout.write(self.style.SUCCESS(
            f'\n🎉 Done! {created} templates created, {updated} updated.'
        ))
