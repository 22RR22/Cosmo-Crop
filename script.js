document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const dropArea = document.getElementById('drop-area');
    const fileInput = document.getElementById('file-input');
    const imageUrlInput = document.getElementById('image-url');
    const loadUrlBtn = document.getElementById('load-url');
    const previewImage = document.getElementById('preview-image');
    const cropBox = document.getElementById('crop-box');
    const widthInput = document.getElementById('width');
    const heightInput = document.getElementById('height');
    const unitSelect = document.getElementById('unit');
    const applyCropBtn = document.getElementById('apply-crop');
    const resetCropBtn = document.getElementById('reset-crop');
    const croppedImage = document.getElementById('cropped-image');
    const downloadBtn = document.getElementById('download-btn');
    const editorSection = document.getElementById('editor');
    const resultSection = document.getElementById('result');
    
    // Variables
    let originalImage = null;
    let originalWidth = 0;
    let originalHeight = 0;
    let cropStartX = 0;
    let cropStartY = 0;
    let isDragging = false;
    let dpi = window.devicePixelRatio || 1; // For inch/cm/mm conversion
    
    // Unit conversion constants (pixels per unit)
    const unitConversions = {
        'px': 1,
        'in': 96 * dpi,  // 96 pixels per inch
        'cm': 37.8 * dpi, // 37.8 pixels per cm
        'mm': 3.78 * dpi  // 3.78 pixels per mm
    };
    
    // Event listeners for drag and drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
    });
    
    function highlight() {
        dropArea.classList.add('highlight');
    }
    
    function unhighlight() {
        dropArea.classList.remove('highlight');
    }
    
    // Handle dropped files
    dropArea.addEventListener('drop', handleDrop, false);
    
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length > 0) {
            handleFiles(files);
        }
    }
    
    // File input change
    fileInput.addEventListener('change', function() {
        handleFiles(this.files);
    });
    
    // Load image from URL
    loadUrlBtn.addEventListener('click', function() {
        const url = imageUrlInput.value.trim();
        if (url) {
            loadImageFromUrl(url);
        }
    });
    
    // Handle image files
    function handleFiles(files) {
        if (files.length === 0) return;
        
        const file = files[0];
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file.');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            loadImageFromUrl(e.target.result);
        };
        reader.readAsDataURL(file);
    }
    
    // Load image from URL
    function loadImageFromUrl(url) {
        const img = new Image();
        img.onload = function() {
            originalWidth = img.width;
            originalHeight = img.height;
            originalImage = img;
            
            // Display the image
            previewImage.src = url;
            editorSection.style.display = 'block';
            
            // Set initial crop dimensions
            initCropBox();
        };
        img.onerror = function() {
            alert('Error loading image. Please check the URL and try again.');
        };
        img.src = url;
    }
    
    // Initialize crop box
    function initCropBox() {
        const containerWidth = previewImage.clientWidth;
        const containerHeight = previewImage.clientHeight;
        
        // Start with a square crop box that's 50% of the smaller dimension
        const cropSize = Math.min(containerWidth, containerHeight) * 0.5;
        
        cropBox.style.width = cropSize + 'px';
        cropBox.style.height = cropSize + 'px';
        cropBox.style.left = (containerWidth - cropSize) / 2 + 'px';
        cropBox.style.top = (containerHeight - cropSize) / 2 + 'px';
        
        // Update dimension inputs
        updateDimensionInputs();
        
        // Make crop box draggable
        makeCropBoxDraggable();
    }
    
    // Update dimension inputs based on crop box size
    function updateDimensionInputs() {
        const currentUnit = unitSelect.value;
        const boxWidth = parseInt(cropBox.style.width);
        const boxHeight = parseInt(cropBox.style.height);
        
        // Convert from pixels to selected unit
        const convertedWidth = Math.round(boxWidth / unitConversions[currentUnit]);
        const convertedHeight = Math.round(boxHeight / unitConversions[currentUnit]);
        
        widthInput.value = convertedWidth;
        heightInput.value = convertedHeight;
    }
    
    // Update crop box based on dimension inputs
    function updateCropBoxFromInputs() {
        const currentUnit = unitSelect.value;
        let inputWidth = parseInt(widthInput.value) || 0;
        let inputHeight = parseInt(heightInput.value) || 0;
        
        // Convert from selected unit to pixels
        const pixelWidth = Math.round(inputWidth * unitConversions[currentUnit]);
        const pixelHeight = Math.round(inputHeight * unitConversions[currentUnit]);
        
        // Ensure the crop box stays within the image boundaries
        const containerWidth = previewImage.clientWidth;
        const containerHeight = previewImage.clientHeight;
        
        let newWidth = Math.min(pixelWidth, containerWidth);
        let newHeight = Math.min(pixelHeight, containerHeight);
        
        // Get current position
        const left = parseInt(cropBox.style.left) || 0;
        const top = parseInt(cropBox.style.top) || 0;
        
        // Adjust position if crop box would go outside bounds
        const newLeft = Math.min(left, containerWidth - newWidth);
        const newTop = Math.min(top, containerHeight - newHeight);
        
        // Update crop box
        cropBox.style.width = newWidth + 'px';
        cropBox.style.height = newHeight + 'px';
        cropBox.style.left = newLeft + 'px';
        cropBox.style.top = newTop + 'px';
    }
    
    // Make crop box draggable
    function makeCropBoxDraggable() {
        cropBox.addEventListener('mousedown', startDragging);
        document.addEventListener('mousemove', dragCropBox);
        document.addEventListener('mouseup', stopDragging);
        
        // Touch support
        cropBox.addEventListener('touchstart', startDragging);
        document.addEventListener('touchmove', dragCropBox);
        document.addEventListener('touchend', stopDragging);
    }
    
    function startDragging(e) {
        e.preventDefault();
        
        // Get mouse/touch position
        const clientX = e.clientX || e.touches[0].clientX;
        const clientY = e.clientY || e.touches[0].clientY;
        
        // Calculate the offset from the crop box edge
        const rect = cropBox.getBoundingClientRect();
        cropStartX = clientX - rect.left;
        cropStartY = clientY - rect.top;
        
        isDragging = true;
    }
    
    function dragCropBox(e) {
        if (!isDragging) return;
        e.preventDefault();
        
        // Get current mouse/touch position
        const clientX = e.clientX || e.touches[0].clientX;
        const clientY = e.clientY || e.touches[0].clientY;
        
        // Calculate new position
        const imageRect = previewImage.getBoundingClientRect();
        const cropBoxWidth = parseInt(cropBox.style.width);
        const cropBoxHeight = parseInt(cropBox.style.height);
        
        let left = clientX - imageRect.left - cropStartX;
        let top = clientY - imageRect.top - cropStartY;
        
        // Keep the crop box within the image boundaries
        left = Math.max(0, Math.min(left, imageRect.width - cropBoxWidth));
        top = Math.max(0, Math.min(top, imageRect.height - cropBoxHeight));
        
        // Update crop box position
        cropBox.style.left = left + 'px';
        cropBox.style.top = top + 'px';
    }
    
    function stopDragging() {
        isDragging = false;
    }
    
    // Apply crop
    applyCropBtn.addEventListener('click', function() {
        applyCrop();
    });
    
    function applyCrop() {
        if (!originalImage) return;
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Get crop dimensions and position
        const imageRect = previewImage.getBoundingClientRect();
        const cropBoxRect = cropBox.getBoundingClientRect();
        
        // Calculate scaling factor between displayed image and original image
        const scaleX = originalImage.width / imageRect.width;
        const scaleY = originalImage.height / imageRect.height;
        
        // Calculate crop area in original image coordinates
        const cropLeft = (cropBoxRect.left - imageRect.left) * scaleX;
        const cropTop = (cropBoxRect.top - imageRect.top) * scaleY;
        const cropWidth = cropBoxRect.width * scaleX;
        const cropHeight = cropBoxRect.height * scaleY;
        
        // Set canvas size to the crop size
        canvas.width = cropWidth;
        canvas.height = cropHeight;
        
        // Draw the cropped portion to the canvas
        ctx.drawImage(
            originalImage,
            cropLeft, cropTop, cropWidth, cropHeight,
            0, 0, cropWidth, cropHeight
        );
        
        // Show the cropped result
        const croppedDataUrl = canvas.toDataURL('image/png');
        croppedImage.src = croppedDataUrl;
        resultSection.style.display = 'block';
        
        // Enable download button
        downloadBtn.disabled = false;
    }
    
    // Reset crop
    resetCropBtn.addEventListener('click', function() {
        initCropBox();
        resultSection.style.display = 'none';
    });
    
    // Change unit
    unitSelect.addEventListener('change', function() {
        updateDimensionInputs();
    });
    
    // Update crop box when dimensions change
    widthInput.addEventListener('change', updateCropBoxFromInputs);
    heightInput.addEventListener('change', updateCropBoxFromInputs);
    
    // Download cropped image
    downloadBtn.addEventListener('click', function() {
        if (!croppedImage.src) return;
        
        // Create a temporary link to trigger download
        const link = document.createElement('a');
        link.href = croppedImage.src;
        link.download = 'cropped-image.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
    
    // Draggable and resizable crop box logic
    let startX, startY, startLeft, startTop;
    let cropBoxRect = { left: 50, top: 50, width: 120, height: 120 };
    
    // Initialize crop box position and size
    function updateCropBox() {
        cropBox.style.left = cropBoxRect.left + 'px';
        cropBox.style.top = cropBoxRect.top + 'px';
        cropBox.style.width = cropBoxRect.width + 'px';
        cropBox.style.height = cropBoxRect.height + 'px';
        cropBox.style.pointerEvents = 'auto';
    }
    updateCropBox();
    
    // Mouse events for dragging
    cropBox.addEventListener('mousedown', function(e) {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        startLeft = cropBoxRect.left;
        startTop = cropBoxRect.top;
        document.body.style.userSelect = 'none';
    });
    
    document.addEventListener('mousemove', function(e) {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        let newLeft = startLeft + dx;
        let newTop = startTop + dy;

        // Keep crop box inside image
        const imgRect = previewImage.getBoundingClientRect();
        const parentRect = cropBox.parentElement.getBoundingClientRect();
        const minLeft = 0;
        const minTop = 0;
        const maxLeft = previewImage.width - cropBoxRect.width;
        const maxTop = previewImage.height - cropBoxRect.height;

        cropBoxRect.left = Math.max(minLeft, Math.min(newLeft, maxLeft));
        cropBoxRect.top = Math.max(minTop, Math.min(newTop, maxTop));
        updateCropBox();
    });

    document.addEventListener('mouseup', function() {
        isDragging = false;
        document.body.style.userSelect = '';
    });

    // Touch events for mobile
    cropBox.addEventListener('touchstart', function(e) {
        if (e.touches.length !== 1) return;
        isDragging = true;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        startLeft = cropBoxRect.left;
        startTop = cropBoxRect.top;
    }, { passive: false });

    document.addEventListener('touchmove', function(e) {
        if (!isDragging || e.touches.length !== 1) return;
        const dx = e.touches[0].clientX - startX;
        const dy = e.touches[0].clientY - startY;
        let newLeft = startLeft + dx;
        let newTop = startTop + dy;

        const maxLeft = previewImage.width - cropBoxRect.width;
        const maxTop = previewImage.height - cropBoxRect.height;

        cropBoxRect.left = Math.max(0, Math.min(newLeft, maxLeft));
        cropBoxRect.top = Math.max(0, Math.min(newTop, maxTop));
        updateCropBox();
    }, { passive: false });

    document.addEventListener('touchend', function() {
        isDragging = false;
    });

    // Update crop box size when user changes dimensions
    function setCropBoxSizeFromInputs() {
        let w = parseInt(widthInput.value, 10) || 100;
        let h = parseInt(heightInput.value, 10) || 100;

        // Limit crop box to image bounds
        w = Math.min(w, previewImage.width - cropBoxRect.left);
        h = Math.min(h, previewImage.height - cropBoxRect.top);

        cropBoxRect.width = w;
        cropBoxRect.height = h;
        updateCropBox();
    }

    widthInput.addEventListener('input', setCropBoxSizeFromInputs);
    heightInput.addEventListener('input', setCropBoxSizeFromInputs);

    // When image loads, set crop box and inputs to default
    previewImage.addEventListener('load', function() {
        const defaultW = Math.floor(previewImage.width / 2);
        const defaultH = Math.floor(previewImage.height / 2);
        cropBoxRect = {
            left: Math.floor(previewImage.width / 4),
            top: Math.floor(previewImage.height / 4),
            width: defaultW,
            height: defaultH
        };
        widthInput.value = defaultW;
        heightInput.value = defaultH;
        updateCropBox();
    });

    // You can use cropBoxRect for cropping logic when user clicks "Crop"
});