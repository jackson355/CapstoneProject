"""
Background job scheduler for email system
This module runs periodic tasks like processing scheduled emails and checking deadline reminders
"""

import logging
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from datetime import datetime
from app.db.session import SessionLocal
from app.services.email_scheduler import EmailScheduler

logger = logging.getLogger(__name__)

# Create scheduler instance
scheduler = BackgroundScheduler()


def process_scheduled_emails_job():
    """
    Background job to process scheduled emails
    Runs every 5 minutes
    """
    db = SessionLocal()
    try:
        logger.info("Running scheduled emails processing job")
        count = EmailScheduler.process_scheduled_emails(db)
        logger.info(f"Processed {count} scheduled emails")
    except Exception as e:
        logger.error(f"Error in scheduled emails job: {str(e)}")
    finally:
        db.close()


def check_deadline_reminders_job():
    """
    Background job to check for deadline reminders
    Runs every hour
    """
    db = SessionLocal()
    try:
        logger.info("Running deadline reminders check job")
        count = EmailScheduler.check_deadline_reminders(db)
        logger.info(f"Created {count} deadline reminders")
    except Exception as e:
        logger.error(f"Error in deadline reminders job: {str(e)}")
    finally:
        db.close()


def start_background_jobs():
    """
    Start all background jobs
    Call this function when the FastAPI app starts
    """
    # Job 1: Process scheduled emails every 5 minutes
    scheduler.add_job(
        func=process_scheduled_emails_job,
        trigger=IntervalTrigger(minutes=5),
        id='process_scheduled_emails',
        name='Process scheduled emails',
        replace_existing=True
    )

    # Job 2: Check deadline reminders every hour
    scheduler.add_job(
        func=check_deadline_reminders_job,
        trigger=IntervalTrigger(hours=1),
        id='check_deadline_reminders',
        name='Check deadline reminders',
        replace_existing=True
    )

    scheduler.start()
    logger.info("Background jobs started successfully")


def shutdown_background_jobs():
    """
    Shutdown all background jobs
    Call this function when the FastAPI app shuts down
    """
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Background jobs shut down successfully")
