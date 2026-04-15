"""
Emails Views — Email Automation System
REST API for triggering emails, managing templates, and AI features.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone

from .models import EmailTemplate, EmailLog
from .serializers import EmailTemplateSerializer, EmailLogSerializer, TriggerEmailSerializer
from .email_service import ai_email_service
from students.models import Student


class EmailTemplateViewSet(viewsets.ModelViewSet):
    """
    CRUD for Email Templates with AI improvement feature.
    GET    /api/emails/templates/
    POST   /api/emails/templates/
    PUT    /api/emails/templates/{id}/
    DELETE /api/emails/templates/{id}/
    POST   /api/emails/templates/{id}/improve_with_ai/
    POST   /api/emails/templates/{id}/detect_tone/
    GET    /api/emails/templates/{id}/send_time_recommendation/
    """
    queryset = EmailTemplate.objects.all()
    serializer_class = EmailTemplateSerializer

    @action(detail=True, methods=['post'])
    def improve_with_ai(self, request, pk=None):
        """Use Claude AI to suggest an improved version of the template body."""
        template = self.get_object()
        improved = ai_email_service.suggest_template_improvement(template.body)
        template.ai_suggested_body = improved
        template.save(update_fields=['ai_suggested_body'])
        return Response({
            'original': template.body,
            'improved': improved,
            'message': 'AI suggestion generated. Use the improved version to update the template.'
        })

    @action(detail=True, methods=['post'])
    def detect_tone(self, request, pk=None):
        """Detect the tone of the current template body."""
        template = self.get_object()
        tone = ai_email_service.detect_tone(template.body)
        template.tone = tone
        template.save(update_fields=['tone'])
        return Response({'tone': tone})

    @action(detail=True, methods=['get'])
    def send_time_recommendation(self, request, pk=None):
        """Get AI-recommended optimal send time for this email type."""
        template = self.get_object()
        recommendation = ai_email_service.recommend_send_time(template.type)
        return Response({'recommendation': recommendation, 'email_type': template.type})

    @action(detail=True, methods=['post'])
    def preview(self, request, pk=None):
        """Preview rendered template with sample data."""
        template = self.get_object()
        sample_context = {
            'name': 'John Doe',
            'email': 'john@example.com',
            'course': 'Full Stack Development',
            'batch': 'Batch 2024',
            'mentor': 'Jane Smith',
            'date': timezone.now().strftime('%B %d, %Y'),
            'feedback': 'Great performance this week!',
            'review_date': '2024-12-30',
            'task_title': 'Build REST API',
            'review_score': '85',
        }
        # Allow override from request
        custom_context = request.data.get('context', {})
        sample_context.update(custom_context)
        subject, body = template.render(sample_context)
        return Response({'subject': subject, 'body': body})


class EmailTriggerViewSet(viewsets.ViewSet):
    """
    Endpoints to trigger email sends (individual and bulk).
    POST /api/emails/trigger/send_single/
    POST /api/emails/trigger/send_bulk/
    POST /api/emails/trigger/send_to_status_group/
    GET  /api/emails/trigger/ai_feedback/{student_id}/
    """

    @action(detail=False, methods=['post'])
    def send_single(self, request):
        """Trigger email to a single student."""
        serializer = TriggerEmailSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        from .tasks import send_email_task
        task = send_email_task.delay(
            student_id=serializer.validated_data['student_id'],
            email_type=serializer.validated_data['email_type'],
            extra_context=serializer.validated_data.get('extra_context', {}),
            attach_pdf=serializer.validated_data.get('attach_pdf'),
        )
        return Response({
            'message': 'Email queued successfully',
            'task_id': task.id,
            'email_type': serializer.validated_data['email_type'],
        })

    @action(detail=False, methods=['post'])
    def send_bulk(self, request):
        """Trigger bulk email to a list of student IDs."""
        student_ids = request.data.get('student_ids', [])
        email_type = request.data.get('email_type')
        extra_context = request.data.get('extra_context', {})

        if not student_ids or not email_type:
            return Response(
                {'error': 'student_ids and email_type are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        from .tasks import send_bulk_email_task
        task = send_bulk_email_task.delay(student_ids, email_type, extra_context)
        return Response({
            'message': f'Bulk email queued for {len(student_ids)} students',
            'task_id': task.id,
        })

    @action(detail=False, methods=['post'])
    def send_to_status_group(self, request):
        """Send email to all students of a specific status (e.g., 'on_hold')."""
        status_filter = request.data.get('status')
        email_type = request.data.get('email_type')

        if not status_filter or not email_type:
            return Response(
                {'error': 'status and email_type are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        student_ids = list(
            Student.objects.filter(status=status_filter).values_list('id', flat=True)
        )

        if not student_ids:
            return Response({'message': f'No students found with status: {status_filter}', 'sent': 0})

        from .tasks import send_bulk_email_task
        task = send_bulk_email_task.delay(student_ids, email_type)
        return Response({
            'message': f'Bulk email queued for {len(student_ids)} students with status: {status_filter}',
            'task_id': task.id,
            'count': len(student_ids),
        })

    @action(detail=False, methods=['get'], url_path='ai_feedback/(?P<student_id>[^/.]+)')
    def ai_feedback(self, request, student_id=None):
        """Generate AI feedback for a student and return it."""
        try:
            student = Student.objects.get(id=student_id)
        except Student.DoesNotExist:
            return Response({'error': 'Student not found'}, status=status.HTTP_404_NOT_FOUND)

        feedback = ai_email_service.generate_feedback(student)
        student.ai_feedback = feedback
        student.save(update_fields=['ai_feedback'])
        return Response({'feedback': feedback, 'student': student.name})
