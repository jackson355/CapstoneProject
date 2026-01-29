import logging
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from datetime import datetime

from ..models import Notification

logger = logging.getLogger(__name__)


class NotificationService:
    """Service for managing user notifications"""

    @staticmethod
    def create_notification(
        db: Session,
        user_id: int,
        title: str,
        message: str,
        notification_type: str,
        related_type: Optional[str] = None,
        related_id: Optional[int] = None,
        notification_metadata: Optional[Dict[str, Any]] = None
    ) -> Notification:
        """
        Create a new notification for a user
        """
        notification = Notification(
            user_id=user_id,
            title=title,
            message=message,
            notification_type=notification_type,
            related_type=related_type,
            related_id=related_id,
            notification_metadata=notification_metadata,
            is_read=False
        )
        db.add(notification)
        db.commit()
        db.refresh(notification)

        logger.info(f"Created notification {notification.id} for user {user_id}")
        return notification

    @staticmethod
    def mark_as_read(
        db: Session,
        notification_id: int,
        user_id: int
    ) -> Optional[Notification]:
        """
        Mark a notification as read
        """
        notification = db.query(Notification).filter(
            Notification.id == notification_id,
            Notification.user_id == user_id
        ).first()

        if notification:
            notification.is_read = True
            notification.read_at = datetime.now()
            db.commit()
            db.refresh(notification)
            logger.info(f"Marked notification {notification_id} as read")

        return notification

    @staticmethod
    def mark_all_as_read(
        db: Session,
        user_id: int
    ) -> int:
        """
        Mark all notifications as read for a user
        Returns: Number of notifications marked as read
        """
        count = db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.is_read == False
        ).update({
            'is_read': True,
            'read_at': datetime.now()
        })
        db.commit()

        logger.info(f"Marked {count} notifications as read for user {user_id}")
        return count

    @staticmethod
    def delete_notification(
        db: Session,
        notification_id: int,
        user_id: int
    ) -> bool:
        """
        Delete a notification
        """
        notification = db.query(Notification).filter(
            Notification.id == notification_id,
            Notification.user_id == user_id
        ).first()

        if notification:
            db.delete(notification)
            db.commit()
            logger.info(f"Deleted notification {notification_id}")
            return True

        return False

    @staticmethod
    def get_unread_count(
        db: Session,
        user_id: int
    ) -> int:
        """
        Get count of unread notifications for a user
        """
        count = db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.is_read == False
        ).count()

        return count

    @staticmethod
    def create_email_sent_notification(
        db: Session,
        user_id: int,
        recipient_email: str,
        email_history_id: int
    ) -> Notification:
        """
        Create notification when email is sent successfully
        """
        return NotificationService.create_notification(
            db=db,
            user_id=user_id,
            title="Email Sent",
            message=f"Email successfully sent to {recipient_email}",
            notification_type="email_sent",
            related_type="email_history",
            related_id=email_history_id,
            notification_metadata={"recipient": recipient_email}
        )

    @staticmethod
    def create_email_failed_notification(
        db: Session,
        user_id: int,
        recipient_email: str,
        error_message: str
    ) -> Notification:
        """
        Create notification when email fails to send
        """
        return NotificationService.create_notification(
            db=db,
            user_id=user_id,
            title="Email Failed",
            message=f"Failed to send email to {recipient_email}: {error_message}",
            notification_type="email_failed",
            notification_metadata={"recipient": recipient_email, "error": error_message}
        )

    @staticmethod
    def create_email_scheduled_notification(
        db: Session,
        user_id: int,
        recipient_email: str,
        scheduled_time: datetime,
        scheduled_email_id: int
    ) -> Notification:
        """
        Create notification when email is scheduled
        """
        return NotificationService.create_notification(
            db=db,
            user_id=user_id,
            title="Email Scheduled",
            message=f"Email to {recipient_email} has been scheduled",
            notification_type="email_scheduled",
            related_type="scheduled_email",
            related_id=scheduled_email_id,
            notification_metadata={"recipient": recipient_email, "scheduled_time": scheduled_time.isoformat()}
        )
