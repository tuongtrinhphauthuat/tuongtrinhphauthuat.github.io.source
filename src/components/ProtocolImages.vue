<template>
  <aside class="protocol-images" role="complementary">
    <div class="protocol-images__list">
      <button v-for="(image, index) in images" :key="image.id || image.url || index" type="button"
        class="protocol-images__item" @click="open(index)">
        <div class="protocol-images__thumb">
          <img :src="image.url" :alt="imageAlt(image, index)" loading="lazy" />
        </div>
        <p v-if="image.description" class="protocol-images__caption">{{ image.description }}</p>
      </button>
    </div>

    <Teleport to="body">
      <div v-if="isOpen && activeImage" class="protocol-images__lightbox" @click.self="close">
        <button class="protocol-images__lightbox-close" type="button" @click="close" aria-label="Close">&times;</button>

        <button v-if="images.length > 1" class="protocol-images__lightbox-nav is-prev" type="button" @click.stop="prev"
          aria-label="Previous">&#8249;</button>

        <figure class="protocol-images__lightbox-figure">
          <div ref="editorContainer" class="protocol-images__lightbox-editor"></div>
          <figcaption v-if="activeImage.description">{{ activeImage.description }}</figcaption>

          <div v-if="images.length > 1" class="protocol-images__thumbnails">
             <div v-for="(thumb, tIdx) in images" :key="'thumb-'+tIdx"
                  :class="['protocol-images__thumbnail', { 'is-active': activeIndex === tIdx }]"
                  @click="open(tIdx)">
               <img :src="thumb.url" :alt="'Thumbnail '+tIdx" />
             </div>
          </div>
        </figure>

        <button v-if="images.length > 1" class="protocol-images__lightbox-nav is-next" type="button" @click.stop="next"
          aria-label="Next">&#8250;</button>
      </div>
    </Teleport>
  </aside>
</template>

<script setup>
import { computed, ref, watch, onBeforeUnmount, nextTick, shallowRef } from 'vue'
import { Editor, ImageComponent, TextTool, BackgroundComponentBackgroundType } from 'js-draw';
import { Mat33, Color4, Rect2 } from '@js-draw/math';
import { MaterialIconProvider } from '@js-draw/material-icons';
import 'js-draw/styles';

/** Create a standard download icon (arrow pointing down into a tray) */
function createDownloadIcon() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '24');
  svg.setAttribute('height', '24');
  svg.setAttribute('fill', 'none');
  svg.innerHTML = '<path d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2v9.67z" fill="currentColor"/>';
  return svg;
}

/**
 * Add transparent overlays around the image area to block drawing outside.
 * Returns a cleanup function.
 */
function setupDrawingBounds(editor, imgWidth, imgHeight) {
  const root = editor.getRootElement();
  // Remove any previous overlays
  root.querySelectorAll('.drawing-bounds-overlay').forEach(el => el.remove());

  const createOverlay = (style) => {
    const div = document.createElement('div');
    div.className = 'drawing-bounds-overlay';
    div.style.cssText = 'position:absolute;z-index:10;pointer-events:auto;background:transparent;' + style;
    return div;
  };

  // Create 4 border overlays - they start covering the entire editor,
  // and we'll resize them once the image position is known.
  const topOverlay = createOverlay('top:0;left:0;right:0;');
  const bottomOverlay = createOverlay('left:0;right:0;');
  const leftOverlay = createOverlay('left:0;');
  const rightOverlay = createOverlay('right:0;');

  const updateOverlayPositions = () => {
    const bbox = editor.getImportExportRect();
    const topLeft = editor.viewport.canvasToScreen({ x: bbox.x, y: bbox.y });
    const bottomRight = editor.viewport.canvasToScreen({ x: bbox.x + bbox.w, y: bbox.y + bbox.h });

    const imgTop = Math.max(0, topLeft.y);
    const imgBottom = Math.max(0, bottomRight.y);
    const imgLeft = Math.max(0, topLeft.x);
    const imgRight = Math.max(0, bottomRight.x);

    topOverlay.style.height = imgTop + 'px';
    bottomOverlay.style.top = imgBottom + 'px';
    bottomOverlay.style.bottom = '0';
    leftOverlay.style.top = imgTop + 'px';
    leftOverlay.style.width = imgLeft + 'px';
    leftOverlay.style.bottom = '0';
    rightOverlay.style.left = imgRight + 'px';
    rightOverlay.style.top = imgTop + 'px';
    rightOverlay.style.bottom = '0';
  };

  // Use createHTMLOverlay to insert into the editor's overlay system
  const topHandle = editor.createHTMLOverlay(topOverlay);
  const bottomHandle = editor.createHTMLOverlay(bottomOverlay);
  const leftHandle = editor.createHTMLOverlay(leftOverlay);
  const rightHandle = editor.createHTMLOverlay(rightOverlay);

  // Update positions initially
  setTimeout(updateOverlayPositions, 50);

  // Listen for viewport changes to update overlay positions
  const wheelHandler = () => setTimeout(updateOverlayPositions, 10);
  root.addEventListener('wheel', wheelHandler, { passive: true });
  const observer = new ResizeObserver(() => setTimeout(updateOverlayPositions, 10));
  observer.observe(root);

  return () => {
    topHandle.remove();
    bottomHandle.remove();
    leftHandle.remove();
    rightHandle.remove();
    root.removeEventListener('wheel', wheelHandler);
    observer.disconnect();
  };
}

/**
 * Load an image from a URL and place it centered into the editor.
 * Uses fetch+blob for reliability, and addAndCenterComponents for proper placement.
 * Resolves with the image dimensions.
 */
async function loadImageIntoEditor(editor, url) {
  console.log('Loading image into editor:', url);
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`);
    const blob = await response.blob();
    console.log('Fetched image blob size:', blob.size);

    // Use FileReader to convert to base64 Data URL to avoid revoking Object URL issues
    // and potential CORS tainting on canvas if js-draw needs it later
    const base64Data = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });

    const img = await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = (e) => reject(new Error('Image failed to load: ' + e));
      image.src = base64Data;
    });

    console.log('Image element created, dimensions:', img.width, img.height);

    const imgWidth = img.width || 800;
    const imgHeight = img.height || 600;

    const imageComponent = await ImageComponent.fromImage(img, Mat33.identity);
    console.log('ImageComponent created:', imageComponent);

    // Set import/export rect to match image dimensions
    editor.dispatch(editor.image.setImportExportRect(new Rect2(0, 0, imgWidth, imgHeight)), false);

    // Add and center the image in one step (official js-draw API)
    await editor.addAndCenterComponents([imageComponent], false);
    console.log('Added and centered components');

    // Make the viewport size perfectly zoom to fit the image on screen
    const bbox = editor.getImportExportRect();
    // Allow zooming in and zooming out to fit both small and large images perfectly
    editor.dispatchNoAnnounce(editor.viewport.zoomTo(bbox, true, true), false);

    return { imgWidth, imgHeight };
  } catch (err) {
    console.error('Error in loadImageIntoEditor:', err);
    throw err;
  }
}

/**
 * Lock canvas panning — only allow zoom (Ctrl+wheel), not scroll/pan.
 * Returns a cleanup function.
 */
function lockCanvasPan(editor) {
  const root = editor.getRootElement();

  const handleWheel = (e) => {
    // Allow zoom (Ctrl+wheel or pinch-to-zoom which sets ctrlKey)
    if (e.ctrlKey || e.metaKey) {
      // Re-center after zoom to prevent drift
      setTimeout(() => {
        try {
          const bbox = editor.getImportExportRect();
          const screenSize = editor.viewport.getScreenRectSize();
          const scale = editor.viewport.getScaleFactor();
          const scaledW = bbox.w * scale;
          const scaledH = bbox.h * scale;
          const dx = (screenSize.x - scaledW) / 2;
          const dy = (screenSize.y - scaledH) / 2;
          editor.viewport.resetTransform(
            Mat33.translation({ x: dx, y: dy }).rightMul(Mat33.scaling2D(scale, { x: 0, y: 0 }))
          );
        } catch (_) { /* ignore errors during cleanup */ }
      }, 20);
      return;
    }
    // Block regular scroll (pan) to keep image centered
    e.preventDefault();
    e.stopPropagation();
  };

  root.addEventListener('wheel', handleWheel, { passive: false, capture: true });
  return () => root.removeEventListener('wheel', handleWheel, { capture: true });
}

/**
 * Set up both drawing bounds and pan lock, returning a combined cleanup function.
 */
function setupEditorGuards(editor, imgWidth, imgHeight) {
  const cleanBounds = setupDrawingBounds(editor, imgWidth, imgHeight);
  const cleanPan = lockCanvasPan(editor);
  return () => {
    cleanBounds();
    cleanPan();
  };
}

const props = defineProps({
  images: {
    type: Array,
    default: () => []
  }
})

const isOpen = ref(false)
const activeIndex = ref(0)
const editorContainer = ref(null)
const editorInstance = shallowRef(null)
const cleanupDrawingBounds = ref(null)

const hasImages = computed(() => Array.isArray(props.images) && props.images.length > 0)

const activeImage = computed(() => {
  if (!hasImages.value) return null
  const idx = Math.min(activeIndex.value, props.images.length - 1)
  return props.images[idx] || null
})


async function copyActiveImage() {
  if (!activeImage.value) return;
  try {
    let blob;
    if (editorInstance.value) {
      const svgElement = editorInstance.value.toSVG();
      const svgString = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = url;
      });

      const canvas = document.createElement('canvas');
      // Use SVG dimensions or fallback
      canvas.width = img.width || parseInt(svgElement.getAttribute('width') || '800', 10);
      canvas.height = img.height || parseInt(svgElement.getAttribute('height') || '600', 10);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      URL.revokeObjectURL(url);
    } else {
      const response = await fetch(activeImage.value.url, { mode: 'cors' });
      if (!response.ok) throw new Error('Network response was not ok');
      blob = await response.blob();
    }

    // Convert generic blobs to a type that ClipboardItem accepts (usually png)
    // If the image is already a png/jpeg it will likely copy fine in most browsers,
    // but some browsers only accept image/png for clipboard write.
    const item = new ClipboardItem({ [blob.type]: blob });
    await navigator.clipboard.write([item]);
    alert('Đã copy ảnh vào Clipboard!');
  } catch (err) {
    console.error('Error copying image: ', err);
    // Fallback if CORS prevents blob fetching or ClipboardItem is unsupported
    try {
      await navigator.clipboard.writeText(activeImage.value.url);
      alert('Không thể copy ảnh do chính sách bảo mật trình duyệt (CORS). Đã copy URL ảnh thay thế!');
    } catch(fallbackErr) {
       alert('Lỗi khi copy ảnh!');
    }
  }
}

watch([isOpen, activeImage], async ([open, imgInfo]) => {
  if (open && imgInfo) {
    await nextTick();
    if (editorContainer.value) {
      // Clean up previous drawing bounds overlays
      if (cleanupDrawingBounds.value) {
        cleanupDrawingBounds.value();
        cleanupDrawingBounds.value = null;
      }
      if (editorInstance.value) {
        editorInstance.value.remove();
      }
      editorContainer.value.innerHTML = '';

      const newEditor = new Editor(editorContainer.value, {
        iconProvider: new MaterialIconProvider(),
      });
      editorInstance.value = newEditor;
      const toolbar = newEditor.addToolbar();

      toolbar.addActionButton({
        label: 'Copy Image',
        icon: newEditor.icons.makeCopyIcon()
      }, async () => {
        try {
          if (!editorInstance.value) return;
          const svgElement = editorInstance.value.toSVG();
          const svgString = new XMLSerializer().serializeToString(svgElement);
          const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
          const url = URL.createObjectURL(svgBlob);

          const img = new Image();
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = url;
          });

          const canvas = document.createElement('canvas');
          canvas.width = img.width || parseInt(svgElement.getAttribute('width') || '800', 10);
          canvas.height = img.height || parseInt(svgElement.getAttribute('height') || '600', 10);
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);

          const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
          URL.revokeObjectURL(url);

          const item = new ClipboardItem({ [blob.type]: blob });
          await navigator.clipboard.write([item]);
          alert('Đã copy ảnh vào Clipboard!');
        } catch (err) {
          console.error('Error copying image: ', err);
          try {
            await navigator.clipboard.writeText(activeImage.value.url);
            alert('Không thể copy ảnh do chính sách bảo mật trình duyệt (CORS). Đã copy URL ảnh thay thế!');
          } catch(fallbackErr) {
             alert('Lỗi khi copy ảnh!');
          }
        }
      });

      toolbar.addActionButton({
        label: 'Download Image',
        icon: createDownloadIcon()
      }, () => {
        if (!editorInstance.value) return;
        const dataUrl = editorInstance.value.toDataURL();
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = 'edited-image.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      });

      // Set white background, solid color, not autoresizing
      newEditor.dispatch(
        newEditor.setBackgroundStyle({
          color: Color4.white,
          type: BackgroundComponentBackgroundType.SolidColor,
          autoresize: false,
        }),
        false
      );

      // Set Text tool as default
      const textTools = newEditor.toolController.getMatchingTools(TextTool);
      if (textTools.length > 0) {
        textTools[0].setEnabled(true);
      }

      // Auto-save edited state
      newEditor.notifier.on('update', () => {
        if (editorInstance.value === newEditor && imgInfo.url) {
           try {
             const cacheKey = `js-draw-cache-${imgInfo.url}`;
             const svgElem = newEditor.toSVG();
             const svgString = new XMLSerializer().serializeToString(svgElem);
             localStorage.setItem(cacheKey, JSON.stringify({
               timestamp: Date.now(),
               svg: svgString
             }));
           } catch (e) {
             console.warn('Failed to save to localStorage, it might be full:', e);
           }
        }
      });

      const cacheKey = `js-draw-cache-${imgInfo.url}`;
      let cachedData = null;
      try {
        const raw = localStorage.getItem(cacheKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          // Check if it's less than 1 hour old (3600000 ms)
          if (Date.now() - parsed.timestamp < 3600000) {
             cachedData = parsed;
          } else {
             localStorage.removeItem(cacheKey); // clear expired cache
          }
        }
      } catch (e) {
        console.error('Failed to read cache:', e);
      }

      // Clean up any previous drawing bounds before loading new image

      if (cachedData && cachedData.svg) {
         newEditor.loadFromSVG(cachedData.svg);
         // Ensure default tool is text even after loading from SVG
         const textTools = newEditor.toolController.getMatchingTools(TextTool);
         if (textTools.length > 0) {
           textTools[0].setEnabled(true);
         }
         // Set up drawing bounds and pan lock for cached SVG
         setTimeout(() => {
           const bbox = newEditor.getImportExportRect();
           cleanupDrawingBounds.value = setupEditorGuards(newEditor, bbox.w, bbox.h);
         }, 100);
      } else {
        // Load image via fetch for reliability (avoids CORS issues with canvas rendering)
        loadImageIntoEditor(newEditor, imgInfo.url).then(({ imgWidth, imgHeight }) => {
          if (editorInstance.value === newEditor) {
            cleanupDrawingBounds.value = setupEditorGuards(newEditor, imgWidth, imgHeight);
          }
        }).catch(() => {
          if (editorInstance.value === newEditor) {
            cleanupDrawingBounds.value = setupEditorGuards(newEditor, 800, 600);
          }
        });
      }
    }
  }
}, { immediate: true })

function open(index) {
  if (!hasImages.value) return
  activeIndex.value = index
  isOpen.value = true
}

function close() {
  isOpen.value = false
}

function next() {
  if (!hasImages.value) return
  activeIndex.value = (activeIndex.value + 1) % props.images.length
}

function prev() {
  if (!hasImages.value) return
  activeIndex.value = (activeIndex.value - 1 + props.images.length) % props.images.length
}

function imageAlt(image, index) {
  if (!image) return `Protocol image ${index + 1}`
  return image.description || `Protocol image ${index + 1}`
}

const onKeydown = event => {
  if (!isOpen.value) return
  if (event.key === 'Escape') {
    event.preventDefault()
    close()
  } else if (event.key === 'ArrowRight') {
    event.preventDefault()
    next()
  } else if (event.key === 'ArrowLeft') {
    event.preventDefault()
    prev()
  }
}

watch(isOpen, value => {
  if (value) {
    window.addEventListener('keydown', onKeydown)
  } else {
    window.removeEventListener('keydown', onKeydown)
    // Clean up drawing bounds when lightbox closes
    if (cleanupDrawingBounds.value) {
      cleanupDrawingBounds.value();
      cleanupDrawingBounds.value = null;
    }
  }
})

watch(
  () => props.images.length,
  () => {
    if (!hasImages.value) {
      isOpen.value = false
      activeIndex.value = 0
    } else if (activeIndex.value >= props.images.length) {
      activeIndex.value = 0
    }
  }
)

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<style scoped>
.protocol-images {
  flex: 1 1 0;
  max-width: 28%;
  min-width: 200px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
}

.protocol-images__list {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
  padding-right: 6px;
}

.protocol-images__item {
  background: #fff;
  border: 1px solid #e6eef8;
  border-radius: 10px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.protocol-images__item:hover {
  border-color: #94a3b8;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
}

.protocol-images__thumb {
  width: 100%;
  overflow: hidden;
  border-radius: 8px;
  background: #f8fafc;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
}

.protocol-images__thumb img {
  width: 100%;
  height: auto;
  max-height: 280px;
  object-fit: contain;
}

.protocol-images__caption {
  margin: 0;
  font-size: 0.85rem;
  color: #1f2937;
  line-height: 1.4;
}

.protocol-images__lightbox {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.85); /* Darker backdrop for better contrast */
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  z-index: 100000;
  transition: opacity 0.3s ease;
}

.protocol-images__lightbox-figure {
  margin: auto;
  width: 85vh; /* default square-ish layout for desktop */
  max-width: 90vw;
  height: 85vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #fff;
  text-align: center;
  position: relative;
}

.protocol-images__lightbox-editor {
  width: 100%;
  height: 100%;
  background: transparent;
  overflow: hidden;
  border-radius: 12px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.protocol-images__lightbox-editor :deep(.imageEditorContainer) {
  width: 100% !important;
  height: 100% !important;
  position: absolute !important;
  top: 0;
  left: 0;
}

/* Make toolbar icons scale better */
.protocol-images__lightbox-editor :deep(.toolbar-root) {
  --toolbar-button-height: min(12vh, 44px);
}

.protocol-images__lightbox-editor :deep(.toolbar-button),
.protocol-images__lightbox-editor :deep(.toolbar-toolContainer > .toolbar-button) {
  min-width: 34px;
  max-width: 60px;
  padding-left: 4px;
  padding-right: 4px;
}

.protocol-images__lightbox-editor :deep(.toolbar-icon) {
  min-width: 18px;
  min-height: 18px;
  max-width: 24px;
  max-height: 24px;
}

.protocol-images__lightbox-editor :deep(.toolbar-root .toolbar-icon) {
  flex-shrink: 1;
  width: 22px;
}

.protocol-images__lightbox-editor :deep(.toolbar-edge-toolbar) {
  --toolbar-button-height: min(12vh, 40px);
}

.protocol-images__lightbox-editor :deep(.toolbar-edge-toolbar .toolbar-toolContainer:not(.no-icon):not(.label-inline) .toolbar-button) {
  width: auto;
  min-width: 34px;
  padding: 4px;
}

.protocol-images__lightbox-figure figcaption {
  font-size: 1rem;
  line-height: 1.5;
}

.protocol-images__lightbox-close {
  position: absolute;
  top: 18px;
  right: 22px;
  background: rgba(15, 23, 42, 0.75);
  color: #fff;
  border: none;
  border-radius: 999px;
  width: 40px;
  height: 40px;
  font-size: 24px;
  cursor: pointer;
}

.protocol-images__lightbox-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(15, 23, 42, 0.6);
  color: #fff;
  border: none;
  border-radius: 999px;
  width: 46px;
  height: 46px;
  font-size: 24px;
  cursor: pointer;
}

.protocol-images__lightbox-nav.is-prev {
  left: 32px;
}

.protocol-images__lightbox-nav.is-next {
  right: 32px;
}


.protocol-images__thumbnails {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: auto;
  overflow-x: auto;
  max-width: 100%;
  padding-bottom: 8px;
}

.protocol-images__thumbnail {
  width: 60px;
  height: 60px;
  border-radius: 6px;
  overflow: hidden;
  opacity: 0.5;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s;
  flex-shrink: 0;
  background: #fff;
}

.protocol-images__thumbnail:hover {
  opacity: 0.8;
}

.protocol-images__thumbnail.is-active {
  opacity: 1;
  border-color: #0ea5e9;
}

.protocol-images__thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
