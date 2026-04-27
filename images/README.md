# Image Organization Guide

## 📁 Images Directory Structure

```
images/
├── logos/           # Brand logos and main branding
├── icons/           # UI icons, buttons, navigation
├── symbols/         # Game symbols, cards, special elements
└── backgrounds/     # Background images, textures, patterns
```

## 🖼️ How to Use Images in HTML

### Basic Image Reference
```html
<img src="images/logos/your-logo.png" alt="Logo description">
```

### For Different Screen Sizes (Responsive)
```html
<picture>
  <source media="(max-width: 768px)" srcset="images/logos/logo-small.png">
  <img src="images/logos/logo-large.png" alt="Responsive Logo">
</picture>
```

### CSS Background Images
```css
.hero-section {
  background-image: url('images/backgrounds/casino-bg.jpg');
}
```

## 📋 File Naming Conventions

- Use lowercase with hyphens: `apollo-royal-logo.svg`
- Be descriptive: `slots-symbol-cherry.png` not `img1.png`
- Include size if multiple versions: `logo-300x80.svg`

## 🗜️ Image Optimization Tips

- **Logos**: Use SVG for crisp scaling
- **Icons**: Use SVG or optimized PNG
- **Photos**: Use WebP with JPEG fallback
- **Backgrounds**: Compress and use appropriate formats

## 🔗 Current Project Images

Your project currently uses embedded images (data URIs). To use external files:

1. Save your images in the appropriate folders above
2. Update HTML: `<img src="data:image/...">` → `<img src="images/logos/your-image.png">`
3. Update CSS: `background: url(data:image/...)` → `background: url('images/backgrounds/your-bg.jpg')`