from datetime import datetime
import traceback
import threading

from django.db import close_old_connections

from .models import BankStatement
from .services import process_statement


def run_background_task(function, *args, **kwargs):
    print("==============================================")
    print("SUBMITTING BACKGROUND TASK")
    print("Function:", function.__name__)
    print("Args:", args)
    print("Kwargs:", kwargs)
    print("==============================================")

    try:
        thread = threading.Thread(
            target=_run_background_function,
            args=(function, args, kwargs),
            daemon=False,
            name=f"background-{function.__name__}",
        )

        thread.start()

        print("Background task submitted successfully.")
        print("Thread:", thread.name)
        print("Thread alive:", thread.is_alive())

        return thread

    except Exception as error:
        print("FAILED TO SUBMIT BACKGROUND TASK:")
        print(repr(error))
        traceback.print_exc()
        raise


def _run_background_function(function, args, kwargs):
    print("==============================================")
    print("BACKGROUND THREAD STARTED")
    print("Function:", function.__name__)
    print("Args:", args)
    print("==============================================")
    start_time = datetime.now()

    close_old_connections()

    try:
        result = function(*args, **kwargs)

        print("==============================================")
        print("BACKGROUND THREAD COMPLETED")
        print("Function:", function.__name__)
        print("Result:", result)
        print("==============================================")
        end_time = datetime.now()
        print(f"Run Time: {end_time - start_time}")

        return result

    except Exception as error:
        print("==============================================")
        print("BACKGROUND THREAD FAILED")
        print("Function:", function.__name__)
        print("Error:", repr(error))
        print("Error Type:", type(error).__name__)
        traceback.print_exc()
        print("==============================================")

    finally:
        close_old_connections()

        print(
            "Background thread database connection cleanup completed."
        )


def process_bank_statement_background(statement_id):
    print("################################################")
    print("BACKGROUND TASK STARTED")
    print("Statement ID:", statement_id)
    print("################################################")

    close_old_connections()

    statement = None

    try:
        print("Getting BankStatement...")

        statement = BankStatement.objects.get(
            id=statement_id
        )

        print(
            "Statement found:",
            statement.id
        )

        if not statement.original_file:
            raise ValueError(
                "BankStatement does not contain original_file."
            )

        print(
            "Original file:",
            statement.original_file.name
        )

        print(
            "Original file path:",
            statement.original_file.path
        )

        statement.status = "PROCESSING"

        statement.save(
            update_fields=[
                "status"
            ]
        )

        print(
            "Status changed to PROCESSING"
        )

        print(
            "Calling process_statement(statement)..."
        )

        result = process_statement(
            statement
        )

        print(
            "process_statement() returned:"
        )

        print(result)

        statement.refresh_from_db()

        print(
            "Statement status after service:",
            statement.status
        )

        if statement.status != "COMPLETED":

            statement.status = "COMPLETED"
            statement.error_message = ""

            statement.save(
                update_fields=[
                    "status",
                    "error_message",
                ]
            )

        print(
            "################################################"
        )

        print(
            "BACKGROUND PROCESSING COMPLETED"
        )

        print(
            "Statement ID:",
            statement_id
        )

        print(
            "################################################"
        )

        return result

    except Exception as error:

        print(
            "################################################"
        )

        print(
            "BACKGROUND PROCESSING FAILED"
        )

        print(
            "Statement ID:",
            statement_id
        )

        print(
            "Error:",
            repr(error)
        )

        print(
            "Error Type:",
            type(error).__name__
        )

        traceback.print_exc()

        print(
            "################################################"
        )

        try:

            if statement is None:

                statement = BankStatement.objects.get(
                    id=statement_id
                )

            statement.status = "FAILED"

            statement.error_message = str(
                error
            )

            statement.save(
                update_fields=[
                    "status",
                    "error_message",
                ]
            )

            print(
                "Statement status changed to FAILED"
            )

        except Exception as db_error:

            print(
                "Failed to update statement:"
            )

            print(
                repr(db_error)
            )

            traceback.print_exc()

        raise

    finally:

        close_old_connections()

        print(
            "Background task cleanup completed."
        )
