"""
Students Views — Email Automation System
Handles CRUD operations and bulk CSV import.
"""
import csv
import io
import pandas as pd
from django.db import transaction
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django_filters.rest_framework import DjangoFilterBackend

from .models import Student
from .serializers import StudentSerializer


class StudentViewSet(viewsets.ModelViewSet):
    """
    Full CRUD for Students with filtering and bulk CSV import.
    
    GET    /api/students/           — List all students
    POST   /api/students/           — Create student
    GET    /api/students/{id}/      — Retrieve student
    PUT    /api/students/{id}/      — Update student
    DELETE /api/students/{id}/      — Delete student
    POST   /api/students/bulk_import/ — Bulk CSV upload
    GET    /api/students/stats/     — Dashboard statistics
    """
    queryset = Student.objects.all()
    serializer_class = StudentSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'batch', 'course']
    search_fields = ['name', 'email', 'mentor', 'batch']
    ordering_fields = ['created_at', 'name', 'review_date', 'review_score']
    ordering = ['-created_at']

    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def bulk_import(self, request):
        """
        Bulk import students from a CSV file.
        Expected columns: name, email, phone, course, batch, mentor, status
        """
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Support both CSV and XLSX
            if file.name.endswith('.xlsx'):
                df = pd.read_excel(file)
            else:
                content = file.read().decode('utf-8')
                df = pd.read_csv(io.StringIO(content))

            created = []
            updated = []
            errors = []

            with transaction.atomic():
                for _, row in df.iterrows():
                    row_dict = row.where(pd.notna(row), None).to_dict()
                    email = row_dict.get('email', '').strip().lower()

                    if not email:
                        errors.append({'row': row_dict, 'error': 'Missing email'})
                        continue

                    try:
                        student, was_created = Student.objects.update_or_create(
                            email=email,
                            defaults={
                                'name': row_dict.get('name', '').strip(),
                                'phone': row_dict.get('phone', '') or '',
                                'course': row_dict.get('course', '') or '',
                                'batch': row_dict.get('batch', '') or '',
                                'mentor': row_dict.get('mentor', '') or '',
                                'status': row_dict.get('status', 'active'),
                            }
                        )
                        if was_created:
                            created.append(email)
                        else:
                            updated.append(email)
                    except Exception as e:
                        errors.append({'row': row_dict, 'error': str(e)})

            return Response({
                'created': len(created),
                'updated': len(updated),
                'errors': errors,
                'total_processed': len(created) + len(updated),
            })
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Dashboard statistics for students."""
        total = Student.objects.count()
        by_status = {}
        for choice in Student.Status.choices:
            by_status[choice[0]] = Student.objects.filter(status=choice[0]).count()

        upcoming_reviews = Student.objects.filter(
            review_date__isnull=False
        ).count()

        return Response({
            'total': total,
            'by_status': by_status,
            'upcoming_reviews': upcoming_reviews,
        })
