import os
from PIL import Image, ImageOps

def process_logo():
    source_path = os.path.join('assets', 'images', 'logo.png')
    dest_path = os.path.join('assets', 'images', 'icon.png')
    
    if not os.path.exists(source_path):
        print(f"Error: {source_path} not found.")
        return

    img = Image.open(source_path).convert("RGBA")
    
    # Create a white background image to handle transparency if any
    bg = Image.new("RGBA", img.size, (255, 255, 255, 255))
    comp = Image.alpha_composite(bg, img)
    
    # Convert to grayscale and invert to find non-white pixels
    gray = comp.convert("L")
    inverted = ImageOps.invert(gray)
    bbox = inverted.getbbox()
    
    if not bbox:
        print("Error: Empty image.")
        return

    # Crop to content
    content = img.crop(bbox)
    
    # Analyze vertical projection to find text gap
    # We scan from bottom up.
    width, height = content.size
    pixels = content.load()
    
    # Simple heuristic: Find the lowest "blank" row that separates content
    # We assume text is at the bottom.
    
    # 1. Find the bottom-most pixel (should be text)
    # 2. Scan up until we find a row of white pixels (the gap)
    # 3. Scan up until we find non-white pixels (the bottom of the logo)
    
    split_y = height
    found_text_bottom = False
    found_gap = False
    
    # Scan from bottom up
    for y in range(height - 1, -1, -1):
        is_row_empty = True
        for x in range(width):
            r, g, b, a = pixels[x, y]
            # Check if pixel is not white
            if r < 250 or g < 250 or b < 250:
                is_row_empty = False
                break
        
        if not found_text_bottom:
            if not is_row_empty:
                found_text_bottom = True
        elif not found_gap:
            if is_row_empty:
                found_gap = True
                split_y = y # This is the gap line
        else:
            # We found the gap, and now we are hitting the logo
            if not is_row_empty:
                break # Done, split_y is the cut point
    
    if found_gap:
        print(f"Found gap at Y={split_y}. Cropping text.")
        logo_only = content.crop((0, 0, width, split_y))
    else:
        print("No clear gap found. Using entire content (maybe no text?).")
        logo_only = content

    # Now we have the logo symbol. Let's make it square with padding.
    # Target size: 1024x1024
    target_size = (1024, 1024)
    final_img = Image.new("RGBA", target_size, (255, 255, 255, 255))
    
    # Resize logo_only to fit within 80% of target
    logo_w, logo_h = logo_only.size
    aspect = logo_w / logo_h
    
    padding = 20 # Reduced padding to maximize size
    max_w = target_size[0] - (padding * 2)
    max_h = target_size[1] - (padding * 2)
    
    if logo_w > logo_h:
        new_w = max_w
        new_h = int(max_w / aspect)
    else:
        new_h = max_h
        new_w = int(max_h * aspect)
        
    logo_resized = logo_only.resize((new_w, new_h), Image.Resampling.LANCZOS)
    
    # Center it
    paste_x = (target_size[0] - new_w) // 2
    paste_y = (target_size[1] - new_h) // 2
    
    final_img.paste(logo_resized, (paste_x, paste_y), logo_resized)
    
    final_img.save(dest_path)
    print(f"Saved icon to {dest_path}")
    
    # Save other variants
    final_img.save(os.path.join('assets', 'images', 'adaptive-icon.png'))
    final_img.save(os.path.join('assets', 'images', 'favicon.png'))
    print("Saved adaptive-icon.png and favicon.png")

if __name__ == "__main__":
    process_logo()
