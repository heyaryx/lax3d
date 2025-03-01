# Lax 3D - Online 3D Modeling, Animation, and Rendering Tool

**Repository URL**: `https://github.com/heyaryx/lax3d`  
**License**: MIT License  
**Language**: HTML , CSS , JavaScript  
**Created On**: March 01, 2025  
**Created By**: Aryx (yea it's me)

## Description

Lax 3D is a lightweight, browser-based tool designed for users to import 3D models, animate them with simple transformations, and render them into various formats. Built with WebGL and Three.js, Lax 3D supports GLB file imports and allows exports as video (MP4), GIF, or image collections (PNG sequences). Perfect for quick visualizations and animations without complex rigging.

## Features

- **Model Import**: Supports GLB file format for 3D models.
- **Animation**: Keyframe-based animation for position, rotation, and scale (no rigging support).
- **Rendering**: Real-time previews with export options for video (MP4), GIF, or image collections (PNG).
- **Browser-Based**: Runs entirely in modern browsers (Chrome, Firefox, Edge) with no external dependencies.
- **Simple Workflow**: Intuitive UI for hobbyists and creators.
- **Open-Source**: Contributions welcome!

## Installation

Lax 3D is a client-side application—no Node.js or build tools required! To run it locally:

### 1. Clone the Repository

```bash
git clone https://github.com/heyaryx/lax-3d.git
cd lax-3d
```

### 2. Open in Browser

- Simply open `index.html` in a modern web browser (e.g., Chrome, Firefox).
- No installation or server setup needed!

## Usage

### 1. Import a Model or choose from our sample

- Launch Lax 3D by opening `index.html`.
- Click "Import" and upload your `.glb` file.
- View your model in the 3D viewport.

### 2. Animate

- Go to the "Animation" tab.
- Use the timeline to add keyframes for position, rotation, or scale.
- Preview your animation live in the viewport.

### 3. Render

- Scroll down to find render button.
- Adjust settings and add keyframes.
- Make sure you deselect the model before rendering as un-necessary details might get rendered aswell.
- Export your work as:
  - **Video**: MP4 format.
  - **GIF**: Animated GIF.
  - **Image Collection**: Sequential PNG files.

## Screenshot

![Lax 3D Screenshot](image/screenshot.png)  
*Caption: A glimpse of Lax 3D in action—import, animate, and render your 3D models with ease.*

*Note: Replace `path/to/screenshot.png` with the actual path to your screenshot once uploaded to the repository.*

## Contributing

We’d love your help improving Lax 3D! To contribute:

1. Fork the repository.
2. Create a new branch (`git checkout -b feature/your-feature`).
3. Commit your changes (`git commit -m "Add your feature"`).
4. Push to your branch (`git push origin feature/your-feature`).
5. Open a Pull Request.

## Dependencies

- [Three.js](https://threejs.org/) - Core 3D rendering library (included via CDN in the project).

No additional tools or runtimes are required—everything runs in the browser!

## Limitations

- **No FBX Support**: Currently only supports GLB files.
- **No Rigging**: Animation is limited to basic transformations (position, rotation, scale).

## License

This project is licensed under the MIT License - see the [LICENSE](license.md) file for details.

## Contact

- **Maintainer**: heyaryx (heyaryx@gmail.com)
- **Issues**: Report bugs or suggest features [here](https://github.com/heyaryx/lax3d/issues).

