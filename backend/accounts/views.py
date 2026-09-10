from django.contrib.auth.models import User
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.core.mail import send_mail
from django.utils.encoding import force_bytes
from django.utils.http import (
    urlsafe_base64_encode,
    urlsafe_base64_decode,
)

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser

from .serializers import (
    SignupSerializer,
    LoginSerializer,
    ResetPasswordSerializer,
)


class SignupView(APIView):

    permission_classes = [AllowAny]

    def post(self, request):

        serializer = SignupSerializer(
            data=request.data
        )

        if serializer.is_valid():

            user = serializer.save()

            return Response(
                {
                    "message": "Account created successfully.",
                    "user": {
                        "id": user.id,
                        "username": user.username,
                        "email": user.email,
                    }
                },
                status=status.HTTP_201_CREATED
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )


class LoginView(APIView):

    permission_classes = [AllowAny]

    def post(self, request):

        serializer = LoginSerializer(
            data=request.data
        )

        if serializer.is_valid():

            return Response(
                serializer.validated_data,
                status=status.HTTP_200_OK
            )

        return Response(
            serializer.errors,
            status=status.HTTP_401_UNAUTHORIZED
        )


class ForgotPasswordView(APIView):

    permission_classes = [AllowAny]

    def post(self, request):

        email = request.data.get("email")

        if not email:
            return Response(
                {
                    "message": "Email is required."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        try:

            user = User.objects.get(
                email=email
            )

        except User.DoesNotExist:

            # Do not reveal whether an email exists
            return Response(
                {
                    "message":
                    "If an account exists, a password reset link has been sent."
                },
                status=status.HTTP_200_OK
            )

        token_generator = PasswordResetTokenGenerator()

        token = token_generator.make_token(user)

        uid = urlsafe_base64_encode(
            force_bytes(user.pk)
        )

        frontend_url = (
            f"http://localhost:5173/reset-password/"
            f"{uid}/{token}"
        )

        send_mail(
            subject="FinApp Password Reset",
            message=(
                "You requested a password reset.\n\n"
                f"Reset your password using this link:\n"
                f"{frontend_url}\n\n"
                "If you did not request this, ignore this email."
            ),
            from_email="noreply@finapp.com",
            recipient_list=[user.email],
            fail_silently=False,
        )

        return Response(
            {
                "message":
                "If an account exists, a password reset link has been sent."
            },
            status=status.HTTP_200_OK
        )


class ResetPasswordView(APIView):

    permission_classes = [AllowAny]

    def post(self, request):

        uid = request.data.get("uid")
        token = request.data.get("token")

        if not uid or not token:

            return Response(
                {
                    "message":
                    "Invalid password reset request."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        try:

            user_id = urlsafe_base64_decode(
                uid
            ).decode()

            user = User.objects.get(
                pk=user_id
            )

        except (
            TypeError,
            ValueError,
            OverflowError,
            User.DoesNotExist,
        ):

            return Response(
                {
                    "message":
                    "Invalid password reset link."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        token_generator = PasswordResetTokenGenerator()

        if not token_generator.check_token(
            user,
            token
        ):

            return Response(
                {
                    "message":
                    "The reset link is invalid or has expired."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = ResetPasswordSerializer(
            data=request.data
        )

        if serializer.is_valid():

            user.set_password(
                serializer.validated_data["password"]
            )

            user.save()

            return Response(
                {
                    "message":
                    "Password reset successfully."
                },
                status=status.HTTP_200_OK
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )


class ProfileView(APIView):

    permission_classes = [IsAuthenticated]

    parser_classes = [
        MultiPartParser,
        FormParser
    ]


    # ==========================================
    # GET PROFILE
    # ==========================================

    def get(self, request):

        user = request.user

        profile, created = user.profile.__class__.objects.get_or_create(
            user=user
        )

        photo_url = None

        if profile.photo:

            photo_url = request.build_absolute_uri(
                profile.photo.url
            )


        return Response({

            "id": user.id,

            "username": user.username,

            "first_name": user.first_name,

            "last_name": user.last_name,

            "email": user.email,

            "phone": profile.phone or "",

            "photo": photo_url,

        })


    # ==========================================
    # UPDATE PROFILE
    # ==========================================

    def patch(self, request):

        print("DATA:", request.data)
        print("FILES:", request.FILES)

        profile = request.user.profile

        if "first_name" in request.data:
            request.user.first_name = request.data["first_name"]

        if "last_name" in request.data:
            request.user.last_name = request.data["last_name"]

        if "email" in request.data:
            request.user.email = request.data["email"]

        request.user.save()

        if "phone" in request.data:
            profile.phone = request.data["phone"]

        if "photo" in request.FILES:
            profile.photo = request.FILES["photo"]

        profile.save()

        photo_url = None

        if profile.photo:
            photo_url = request.build_absolute_uri(
                profile.photo.url
            )

        return Response({
            "message": "Profile updated successfully.",
            "user": {
                "id": request.user.id,
                "username": request.user.username,
                "first_name": request.user.first_name,
                "last_name": request.user.last_name,
                "email": request.user.email,
                "phone": profile.phone or "",
                "photo": photo_url,
            }
        })