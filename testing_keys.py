import platform
import threading
import time
import tkinter as tk
from tkinter import scrolledtext

import pyautogui


def press_shortcut():
    """
    Function to press the keyboard shortcut Ctrl+Command+= on Mac
    """
    print("Pressing keyboard shortcut (Ctrl+Command+=)")
    print("You have 5 seconds to switch to the target window...")
    time.sleep(5)

    if platform.system() == "Darwin":  # macOS
        pyautogui.hotkey("ctrl", "shift", "=")
    else:
        pyautogui.hotkey("ctrl", "alt", "=")  # Alternative for non-Mac systems

    print("Keyboard shortcut pressed")


class TextDisplayApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Text Display Application")
        self.root.geometry("600x500")
        self.is_recording = False
        self.input_thread = None
        self.stop_event = threading.Event()

        # Create a frame for control buttons
        control_frame = tk.Frame(root)
        control_frame.pack(pady=10, padx=10, fill=tk.X)

        # Start and Stop buttons
        self.start_button = tk.Button(
            control_frame,
            text="Start",
            command=self.start_recording,
            bg="green",
            fg="white",
        )
        self.start_button.pack(side=tk.LEFT, padx=5)

        self.stop_button = tk.Button(
            control_frame,
            text="Stop",
            command=self.stop_recording,
            bg="red",
            fg="white",
            state=tk.DISABLED,
        )
        self.stop_button.pack(side=tk.LEFT, padx=5)

        # Create a frame for input
        self.input_frame = tk.Frame(root)
        self.input_frame.pack(pady=10, padx=10, fill=tk.X)

        # Text input field (initially disabled)
        tk.Label(self.input_frame, text="Enter text:").pack(side=tk.LEFT, padx=5)
        self.text_input = tk.Entry(self.input_frame, width=50, state=tk.DISABLED)
        self.text_input.pack(side=tk.LEFT, padx=5, expand=True, fill=tk.X)
        self.text_input.bind("<Return>", self.add_text)

        # Add button
        self.add_button = tk.Button(
            self.input_frame, text="Add Text", command=self.add_text, state=tk.DISABLED
        )
        self.add_button.pack(side=tk.LEFT, padx=5)

        # Clear button
        self.clear_button = tk.Button(
            self.input_frame, text="Clear All", command=self.clear_text
        )
        self.clear_button.pack(side=tk.LEFT, padx=5)

        # Status label
        self.status_label = tk.Label(root, text="Status: Not Recording", fg="red")
        self.status_label.pack(pady=5)

        # Text display area
        self.text_display = scrolledtext.ScrolledText(root, width=70, height=20)
        self.text_display.pack(pady=10, padx=10, expand=True, fill=tk.BOTH)

    def start_recording(self):
        """Start the recording process"""
        self.is_recording = True
        self.stop_event.clear()

        # Update UI
        self.start_button.config(state=tk.DISABLED)
        self.stop_button.config(state=tk.NORMAL)
        self.text_input.config(state=tk.NORMAL)
        self.add_button.config(state=tk.NORMAL)
        self.status_label.config(text="Status: Recording", fg="green")

        # Create a new textbox for input
        self.create_new_textbox()

        # Press the keyboard shortcut
        self.input_thread = threading.Thread(target=self.press_keys_thread, daemon=True)
        self.input_thread.start()

    def create_new_textbox(self):
        """Create a new textbox and set focus to it"""
        # Clear the current textbox
        self.text_input.delete(0, tk.END)
        # Set focus to the textbox
        self.text_input.focus_set()

    def press_keys_thread(self):
        """Thread function to press keys"""
        # Press the initial shortcut
        press_shortcut()

        # Keep the thread running until stop is requested
        while not self.stop_event.is_set():
            time.sleep(0.1)

    def stop_recording(self):
        """Stop the recording process"""
        if self.is_recording:
            self.is_recording = False
            self.stop_event.set()

            # Press Escape key to stop the process
            pyautogui.press("escape")

            # Update UI
            self.start_button.config(state=tk.NORMAL)
            self.stop_button.config(state=tk.DISABLED)
            self.text_input.config(state=tk.DISABLED)
            self.add_button.config(state=tk.DISABLED)
            self.status_label.config(text="Status: Not Recording", fg="red")

            # Add a message to the display
            self.text_display.insert(tk.END, "--- Recording stopped ---\n")

    def add_text(self, event=None):
        """Add the input text to the display area"""
        text = self.text_input.get()
        if text:
            self.text_display.insert(tk.END, text + "\n")
            self.text_input.delete(0, tk.END)  # Clear the input field

    def clear_text(self):
        """Clear all text from the display area"""
        self.text_display.delete(1.0, tk.END)


def main():
    # Check if we're on macOS
    if platform.system() != "Darwin":
        print(
            "Note: This script was designed for macOS. Using alternative shortcut for your platform."
        )

    # Create the main window
    root = tk.Tk()
    app = TextDisplayApp(root)

    # Start the GUI main loop
    root.mainloop()


if __name__ == "__main__":
    main()
