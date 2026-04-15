# MailFlow — AI-Powered Email Automation System

A production-ready, full-stack email automation platform built for managing student/candidate communications with AI features, PDF generation, real-time tracking, and scheduled sending.

---

## 🏗 Architecture Overview

```
email-automation/
├── backend/                     # Django + DRF + Celery
│   ├── core/                    # Settings, URLs, ASGI, Celery config
│   ├── students/                # Student model, CRUD, CSV import
│   ├── emails/                  # Templates, sending service, PDF gen, tasks
│   │   ├── email_service.py     # Core send logic + AI features (Anthropic)
│   │   ├── pdf_service.py       # ReportLab PDF generator
│   │   ├── tasks.py             # Celery async + scheduled tasks
│   │   ├── consumers.py         # WebSocket consumer
│   │   └── management/
│   │       └── seed_templates.py  # Default template seeder
│   ├── logs/                    # EmailLog model, analytics, CSV export
│   └── requirements.txt
├── frontend/                    # React 18 + Vite
│   └── src/App.jsx              # Complete admin dashboard (single file)
├── docker-compose.yml           # Full stack deployment
└── .env.example                 # Environment variables template
```

---

## ⚡ Quick Start (Local Development)

### 1. Prerequisites
- Python 3.11+
- Node.js 20+
- PostgreSQL 15+
- Redis 7+

### 2. Backend Setup

```bash
# Clone and enter project
cd email-automation/backend

# Create virtual environment
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy and configure environment
cp ../.env.example ../.env
# Edit .env with your DB credentials and email settings

# Run database migrations
python manage.py migrate

# Seed default email templates (all 8 types)
python manage.py seed_templates

# Create superuser for admin
python manage.py createsuperuser

# Start Django server
python manage.py runserver
```

### 3. Start Celery (in separate terminals)

```bash
# Worker — processes email sending tasks
celery -A core worker -l info

# Beat — runs scheduled jobs (weekly emails, reminders, retries)
celery -A core beat -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler
```

### 4. Frontend Setup

```bash
cd email-automation/frontend
npm install
npm run dev
# Visit http://localhost:3000
```

---

## 🐳 Docker Deployment (Recommended)

```bash
cp .env.example .env
# Fill in your credentials in .env

docker-compose up --build -d

# View logs
docker-compose logs -f backend
docker-compose logs -f celery_worker
```

Services:
- Frontend: http://localhost:3000
- Django API: http://localhost:8000
- Django Admin: http://localhost:8000/admin

---

## 📧 Gmail SMTP Setup

1. Enable 2FA on your Google account
2. Go to Google Account → Security → App Passwords
3. Generate an app password for "Mail"
4. Set in `.env`:
   ```
   EMAIL_HOST_USER=yourmail@gmail.com
   EMAIL_HOST_PASSWORD=your-16-char-app-password
   ```

---

## 🧠 AI Features (Anthropic Claude)

Set your Anthropic API key in `.env`:
```
ANTHROPIC_API_KEY=sk-ant-...
```

Features enabled:
- **Auto-generate feedback** — AI writes personalized review feedback per student
- **Template improvement** — AI suggests better email body copy
- **Tone detection** — Classify template as formal/informal/friendly
- **Smart scheduling** — AI recommends optimal send times per email type

---

## 📋 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/token/` | Get JWT token (login) |
| POST | `/api/auth/token/refresh/` | Refresh token |

### Students
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/students/` | List students (search, filter, paginate) |
| POST | `/api/students/` | Create student |
| GET | `/api/students/{id}/` | Get student |
| PUT | `/api/students/{id}/` | Update student |
| DELETE | `/api/students/{id}/` | Delete student |
| POST | `/api/students/bulk_import/` | Upload CSV/XLSX |
| GET | `/api/students/stats/` | Dashboard statistics |

### Email Templates
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/emails/templates/` | List all templates |
| PUT | `/api/emails/templates/{id}/` | Update template |
| POST | `/api/emails/templates/{id}/improve_with_ai/` | AI improvement |
| POST | `/api/emails/templates/{id}/detect_tone/` | Detect tone |
| GET | `/api/emails/templates/{id}/send_time_recommendation/` | AI scheduling tip |
| POST | `/api/emails/templates/{id}/preview/` | Preview rendered template |

### Email Triggers
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/emails/trigger/send_single/` | Send to one student |
| POST | `/api/emails/trigger/send_bulk/` | Send to list of IDs |
| POST | `/api/emails/trigger/send_to_status_group/` | Send to all with status |
| GET | `/api/emails/trigger/ai_feedback/{student_id}/` | Generate AI feedback |

### Logs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/logs/` | List email logs (filter by status/type) |
| GET | `/api/logs/analytics/` | Dashboard analytics + trends |
| GET | `/api/logs/export_csv/` | Download logs as CSV |

---

## 📬 Email Types (All 8 Implemented)

| # | Type | Template Key | PDF? | Trigger |
|---|------|-------------|------|---------|
| 1 | Review Feedback | `review_feedback` | No | Manual / On review complete |
| 2 | Weekly Schedule | `weekly_schedule` | No | Auto: Every Sunday 8 AM |
| 3 | Offer Letter | `offer_letter` | ✅ Yes | Manual / On selected |
| 4 | Certificate | `certificate` | ✅ Yes | Manual / On completed |
| 5 | First Review | `first_review` | No | Manual / On first review scheduled |
| 6 | Task Allocation | `task_allocation` | ✅ Yes | Manual / On task assigned |
| 7 | Review Reminder | `review_reminder` | No | Auto: Daily 9 AM (3 days before) |
| 8 | Hold Mail | `hold` | No | Manual / On hold status / Bulk |

---

## 📦 Sample CSV Format for Bulk Import

```csv
name,email,phone,course,batch,mentor,status
John Doe,john@example.com,9876543210,Full Stack,Batch2024,Jane Smith,active
Jane Smith,jane@example.com,,Python Backend,Batch2024,Bob Jones,active
```

---

## 📊 Database Schema

### Student
```
id, name, email (unique), phone, status, course, batch, mentor,
review_date, review_score, feedback, ai_feedback,
task_title, task_description, task_due_date,
created_at, updated_at
```

### EmailTemplate
```
id, type (unique), name, subject, body,
ai_suggested_body, tone, has_pdf_attachment, is_active,
created_at, updated_at
```

### EmailLog
```
id, student (FK), email_type, recipient_email, subject, body_preview,
status (sent/failed/pending/retrying), error_message,
has_attachment, attachment_path, retry_count, max_retries,
task_id, sent_at, created_at, updated_at
```

---

## 🔄 Celery Scheduled Tasks

| Task | Schedule | Description |
|------|----------|-------------|
| `send_weekly_schedule_emails` | Sunday 8 AM | Weekly schedule to all active students |
| `send_review_reminders` | Daily 9 AM | Reminder to students with review in next 3 days |
| `retry_failed_emails` | Every 2 hours | Auto-retry failed emails (max 3 retries) |

---

## 🔌 WebSocket

Real-time notifications stream to the admin dashboard via WebSocket:
```
ws://localhost:8000/ws/notifications/
```

Payload:
```json
{
  "email_type": "review_feedback",
  "student_name": "John Doe",
  "success": true,
  "message": "Email sent successfully",
  "timestamp": "2024-12-29T10:00:00Z"
}
```

---

## 🔐 Environment Variables Reference

```env
SECRET_KEY=...              # Django secret key
DEBUG=True                  # False in production
DB_NAME/USER/PASSWORD/HOST  # PostgreSQL credentials
REDIS_URL=...               # Redis connection string
EMAIL_HOST_USER=...         # Gmail address
EMAIL_HOST_PASSWORD=...     # Gmail app password
ANTHROPIC_API_KEY=...       # Claude AI features
SENDGRID_API_KEY=...        # Alternative to SMTP
```

---

## 🏆 Hackathon Highlights

- ✅ **8 email types** all implemented end-to-end
- ✅ **PDF generation** (Offer Letter, Certificate, Task Sheet) via ReportLab
- ✅ **AI features** via Anthropic Claude (feedback, templates, tone, scheduling)
- ✅ **Real-time WebSocket** notifications
- ✅ **Celery + Beat** for async and scheduled tasks
- ✅ **Auto-retry** failed emails (up to 3 times, every 2 hours)
- ✅ **Bulk CSV import** (CSV + XLSX support)
- ✅ **Email tracking** with full log and analytics
- ✅ **CSV export** of email logs
- ✅ **Role-based auth** via JWT
- ✅ **Docker** compose for one-command deployment
- ✅ **Django Admin** with all models registered
