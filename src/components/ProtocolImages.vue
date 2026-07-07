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
import { Mat33, Color4 } from '@js-draw/math';
import { MaterialIconProvider } from '@js-draw/material-icons';
import 'js-draw/styles';

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
      if (editorInstance.value) {
        editorInstance.value.remove();
      }
      editorContainer.value.innerHTML = '';

      const newEditor = new Editor(editorContainer.value, {
        iconProvider: new MaterialIconProvider(),
        wheelEventsEnabled: false,
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
        icon: newEditor.icons.makeSaveIcon()
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

      if (cachedData && cachedData.svg) {
         newEditor.loadFromSVG(cachedData.svg);
         // Ensure default tool is text even after loading from SVG
         const textTools = newEditor.toolController.getMatchingTools(TextTool);
         if (textTools.length > 0) {
           textTools[0].setEnabled(true);
         }
      } else {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = imgInfo.url;
        img.onload = async () => {
          if (editorInstance.value === newEditor) {
            // Define canvas width/height manually since we want a fixed square coordinate system
            // say 1000x1000
            const canvasSize = 1000;
            const imgWidth = img.width || 1000;
            const imgHeight = img.height || 1000;

            // Scale the image down (or up) to fit inside the square canvas
            const scale = Math.min(canvasSize / imgWidth, canvasSize / imgHeight) * 0.95; // 5% padding

            // Calculate translation to center the scaled image
            const scaledWidth = imgWidth * scale;
            const scaledHeight = imgHeight * scale;
            const dx = (canvasSize - scaledWidth) / 2;
            const dy = (canvasSize - scaledHeight) / 2;

            // Apply scale and translation
            let transform = Mat33.scaling2D(scale, { x: 0, y: 0 });
            transform = Mat33.translation({ x: dx, y: dy }).rightMul(transform);

            const imageComponent = await ImageComponent.fromImage(img, transform);

            // Add the image to the editor without altering the viewport
            await newEditor.dispatch(newEditor.image.addElement(imageComponent), false);

            // Force the image editor export area to be exactly our canvasSize square
            newEditor.dispatch(newEditor.image.setImportExportRect({ x: 0, y: 0, w: canvasSize, h: canvasSize }), false);

            // Center viewport on our 1000x1000 box
            newEditor.viewport.resetTransform();
            const bbox = newEditor.getImportExportRect();
            const screenSize = newEditor.viewport.getScreenRectSize();
            // Scale so the box fits entirely in the screen with a tiny bit of margin, but basically fills
            const viewportScale = Math.min(screenSize.x / bbox.w, screenSize.y / bbox.h);
            const vpTransform = Mat33.scaling2D(viewportScale, { x: 0, y: 0 });
            const screenDx = (screenSize.x - bbox.w * viewportScale) / 2;
            const screenDy = (screenSize.y - bbox.h * viewportScale) / 2;
            newEditor.viewport.updateTransform(
              Mat33.translation({ x: screenDx, y: screenDy }).rightMul(vpTransform)
            );
          }
        };
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
  background: rgba(15, 23, 42, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  z-index: 100000;
}

.protocol-images__lightbox-figure {
  margin: auto;
  width: 85vh; /* adjust this as needed */
  max-width: 90vw;
  height: 85vh; /* make it roughly square based on height */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #fff;
  text-align: center;
}

.protocol-images__lightbox-editor {
  width: 100%;
  height: 100%;
  aspect-ratio: 1 / 1;
  background: transparent;
  overflow: hidden;
  border-radius: 12px;
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
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
