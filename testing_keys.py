import pyautogui
import time
import platform

def press_special_key():
    """
    Function to press the swift key on a Mac keyboard
    """
    print("Pressing swift key")
    print("You have 5 seconds to switch to the target window...")
    time.sleep(5)
    
    # On macOS, the swift key might be mapped to a specific key code
    # We can try using key codes that are often used for special keys

        # Try using function key F16 which sometimes maps to special keys
    pyautogui.press('f16')
    print("Attempted to press swift key using F16 key")

if __name__ == "__main__":
    # Check if we're on macOS since swift key is Mac-specific
    if platform.system() != "Darwin":
        print("This script is designed for macOS. Swift key is not available on this platform.")
    else:
        # Attempt to press the swift key
        press_special_key()