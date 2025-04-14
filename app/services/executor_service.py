import logging
import os
import threading
import time
import uuid
from datetime import datetime
from typing import Dict, Optional

from recipe_executor.context import Context
from recipe_executor.executor import Executor

from app.models.recipe import ExecutionStatus, Recipe
from app.services.file_service import FileService

logger = logging.getLogger("recipe-executor-ux")


class ExecutorService:
    """Service for executing recipes"""

    def __init__(self):
        """Initialize the executor service"""
        self.executions: Dict[str, ExecutionStatus] = {}
        self.executor = Executor()

        # Create directories
        for directory in ["logs", "files"]:
            if not os.path.exists(directory):
                os.makedirs(directory)
                logger.info(f"Created directory: {directory}")

        self.file_service = FileService(files_dir="files")

    def execute_recipe(
        self, recipe: Recipe, context_vars: Optional[Dict[str, str]] = None
    ) -> str:
        """
        Execute a recipe asynchronously and return the execution ID

        Args:
            recipe: The recipe to execute
            context_vars: Optional context variables

        Returns:
            str: The execution ID
        """
        # Generate unique execution ID
        execution_id = str(uuid.uuid4())

        # Setup execution status
        status = ExecutionStatus(
            execution_id=execution_id,
            recipe_id=recipe.id,
            status="pending",
            start_time=datetime.now(),
            end_time=None,
            current_step=None,
            context=None,
            error=None,
            total_steps=len(recipe.steps),
            logs=[],
        )

        # Store execution status
        self.executions[execution_id] = status

        # Start execution in background thread
        thread = threading.Thread(
            target=self._execute_recipe_thread,
            args=(execution_id, recipe, context_vars or {}),
        )
        thread.daemon = True
        thread.start()

        return execution_id

    def _execute_recipe_thread(
        self, execution_id: str, recipe: Recipe, context_vars: Dict[str, str]
    ):
        """Background thread for recipe execution"""
        import asyncio

        status = self.executions[execution_id]
        status.status = "running"

        # Custom logger to capture logs
        log_handler = LogCaptureHandler(status)
        custom_logger = logging.getLogger(f"execution-{execution_id}")
        custom_logger.setLevel(logging.INFO)
        custom_logger.addHandler(log_handler)

        # Convert recipe model to recipe JSON format and process file references
        steps = []
        for step in recipe.steps:
            step_dict = step.model_dump(exclude_none=True)

            # Process file_id if present (for read_files steps)
            if step.type == "read_files" and "file_id" in step_dict:
                file_id = step_dict.pop("file_id")  # Remove file_id from step dict
                file_info = self.file_service.get_file(file_id)
                if file_info:
                    # Get absolute path to the file
                    file_path = self.file_service.get_file_path(file_id)
                    if file_path:
                        # Replace file_id with actual path
                        step_dict["path"] = file_path

                        # Add the file info to context
                        if step.artifact:
                            try:
                                artifact_key = step.artifact
                                file_id_key = f"{artifact_key}_file_id"
                                file_name_key = f"{artifact_key}_file_name"

                                # Only add if not already present
                                if not context_vars.get(file_id_key):
                                    context_vars[file_id_key] = file_id
                                    context_vars[file_name_key] = file_info.name
                                    custom_logger.info(
                                        f"Added file references to context: {file_id_key}={file_id}, {file_name_key}={file_info.name}"
                                    )
                            except Exception as e:
                                custom_logger.error(
                                    f"Error adding file info to context: {str(e)}"
                                )

                        custom_logger.info(
                            f"Using uploaded file: {file_info.name} ({file_id})"
                        )
                    else:
                        custom_logger.error(f"File content not found for {file_id}")
                else:
                    custom_logger.error(f"File info not found for {file_id}")

            steps.append(step_dict)

        recipe_dict = {"steps": steps}

        try:
            # Initialize context with variables
            context = Context(artifacts=context_vars)

            # Execute recipe
            custom_logger.info(f"Starting execution of recipe: {recipe.name}")

            # Track progress through steps
            for i, _ in enumerate(recipe.steps):
                status.current_step = i
                custom_logger.info(f"Running step {i + 1} of {len(recipe.steps)}")

                # Add small delay to simulate step progress
                time.sleep(0.5)

            # Create a new event loop for this thread
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)

            try:
                # Run the executor in the event loop
                loop.run_until_complete(
                    self.executor.execute(recipe_dict, context, logger=custom_logger)
                )

                # Save generated files from context
                self._save_generated_files(context, custom_logger)

                # Register any files that were written to the files directory
                self._register_written_files(execution_id, context, custom_logger)
            finally:
                loop.close()

            # Update status on completion
            status.status = "completed"
            status.end_time = datetime.now()

            # Get context dict in a robust way
            try:
                if hasattr(context, "as_dict"):
                    status.context = context.as_dict()
                elif isinstance(context, dict):
                    status.context = context
                else:
                    # Convert to dict if possible
                    status.context = dict(context)
            except Exception as e:
                custom_logger.error(f"Error extracting context: {str(e)}")
                status.context = {"error": f"Failed to extract context: {str(e)}"}

            custom_logger.info("Recipe execution completed successfully")

        except Exception as e:
            # Update status on failure
            status.status = "failed"
            status.end_time = datetime.now()
            status.error = str(e)
            custom_logger.error(f"Recipe execution failed: {str(e)}")

    def get_execution_status(self, execution_id: str) -> Optional[ExecutionStatus]:
        """Get the status of a recipe execution"""
        return self.executions.get(execution_id)

    def _save_generated_files(self, context, logger):
        """Save files generated during execution to the file system"""
        # Handle different context structures
        try:
            # First try to get a dict representation using as_dict()
            if hasattr(context, "as_dict"):
                context_dict = context.as_dict()
            # Fall back to treating context as a dict
            elif isinstance(context, dict):
                context_dict = context
            else:
                # Try to convert to dict if possible
                context_dict = dict(context)

            logger.info(
                f"Scanning context for file content. Found {len(context_dict)} keys"
            )
        except Exception as e:
            logger.error(f"Error accessing context: {str(e)}")
            return

        for key, value in context_dict.items():
            # Skip keys that are already file references
            if key.endswith("_file_id") or key.endswith("_file_name"):
                continue

            # Try to identify file content in the context
            is_file_content = (
                key.endswith("_file")
                or key.endswith("_content")
                or key.endswith("_output")
                or key.endswith("_result")
                or key.endswith("_data")
            )

            if is_file_content and value is not None:
                try:
                    # Generate a suitable filename
                    base_name = key
                    for suffix in ["_file", "_content", "_output", "_result", "_data"]:
                        base_name = base_name.replace(suffix, "")

                    # Handle different content types
                    if isinstance(value, str):
                        # Text content
                        if len(value) > 0:
                            filename = f"{base_name}.txt"
                            content_type = "text/plain"
                            content = value.encode("utf-8")
                        else:
                            continue  # Skip empty strings
                    elif isinstance(value, bytes):
                        # Binary content - try to detect type
                        if len(value) > 0:
                            filename = f"{base_name}.bin"
                            content_type = "application/octet-stream"
                            content = value
                        else:
                            continue  # Skip empty bytes
                    elif isinstance(value, (dict, list)) and value:
                        # JSON-serializable data
                        import json

                        filename = f"{base_name}.json"
                        content_type = "application/json"
                        content = json.dumps(value, indent=2).encode("utf-8")
                    else:
                        # Skip other types or empty values
                        continue

                    # Save the generated file
                    file_info = self.file_service.save_generated_file(
                        filename=filename,
                        content=content,
                        content_type=content_type,
                    )
                    logger.info(
                        f"Saved generated file: {file_info.name} ({file_info.id})"
                    )

                    # Add file reference to context
                    # Handle different context structures
                    try:
                        file_id_key = f"{base_name}_file_id"
                        file_name_key = f"{base_name}_file_name"

                        # Direct dictionary-style access for Context class
                        if hasattr(context, "__setitem__"):
                            context[file_id_key] = file_info.id
                            context[file_name_key] = file_info.name
                        # If context has no __setitem__ but is a dict, update it directly
                        elif isinstance(context_dict, dict):
                            # Update the context dict directly
                            context_dict[file_id_key] = file_info.id
                            context_dict[file_name_key] = file_info.name
                    except Exception as e:
                        logger.error(
                            f"Error updating context with file references: {str(e)}"
                        )
                except Exception as e:
                    logger.error(f"Error saving content from {key}: {str(e)}")

    def _register_written_files(self, execution_id, context, logger):
        """Update context with references to files that were written by the recipe"""
        # We no longer need to register written files - they are already written by the write_files step
        # This method can be simplified to just find files mentioned in logs and add their info to context
        try:
            # Extract log messages about written files
            status = self.executions.get(execution_id)
            if not status:
                logger.error(f"Execution status not found for ID: {execution_id}")
                return

            for log in status.logs:
                if "Successfully wrote file:" in log:
                    try:
                        # Expected format: "Successfully wrote file: PATH (size: SIZE bytes)"
                        file_path = (
                            log.split("Successfully wrote file:")[1]
                            .split("(size:")[0]
                            .strip()
                        )

                        # Only process files in the files directory
                        if not (file_path.startswith("./files/") or file_path.startswith("files/")):
                            continue

                        # Make the path consistent
                        if file_path.startswith("./"):
                            file_path = file_path[2:]  # Remove './'
                        if not os.path.isabs(file_path):
                            file_path = os.path.abspath(file_path)
                        
                        # Skip if file doesn't exist
                        if not os.path.exists(file_path):
                            logger.error(f"File doesn't exist: {file_path}")
                            continue
                            
                        # Get just the filename from the path and determine base name
                        filename = os.path.basename(file_path)
                        base_name = os.path.splitext(filename)[0]
                        
                        # Update context with file references
                        file_id_key = f"{base_name}_file_id"
                        file_name_key = f"{base_name}_file_name"
                        
                        # Add to context - using the filename as the ID (simplest approach)
                        if hasattr(context, "__setitem__"):
                            context[file_id_key] = filename
                            context[file_name_key] = filename
                        elif isinstance(context, dict):
                            context[file_id_key] = filename
                            context[file_name_key] = filename
                            
                        logger.info(f"Added file reference to context: {file_path}")
                        
                    except Exception as e:
                        logger.error(f"Error processing written file from log: {log} - {str(e)}")
                        
        except Exception as e:
            logger.error(f"Error updating context with written files: {str(e)}")


class LogCaptureHandler(logging.Handler):
    """Custom log handler that captures logs in the execution status"""

    def __init__(self, status: ExecutionStatus):
        super().__init__()
        self.status = status

    def emit(self, record):
        log_entry = self.format(record)
        self.status.logs.append(log_entry)
