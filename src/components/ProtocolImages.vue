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
        <button class="protocol-images__lightbox-copy" type="button" @click="copyActiveImage" title="Copy Image">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M16 1H4C2.9 1 2 1.9 2 3v14h2V3h12V1zm3 4H8C6.9 5 6 5.9 6 7v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
          </svg>
        </button>

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
import { Editor, ImageComponent, BackgroundComponentBackgroundType } from 'js-draw';
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
        iconProvider: new MaterialIconProvider()
      });
      editorInstance.value = newEditor;
      newEditor.addToolbar();

      newEditor.dispatch(newEditor.setBackgroundStyle({
        color: Color4.transparent,
        type: BackgroundComponentBackgroundType.SolidColor,
        autoresize: true,
      }));

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = imgInfo.url;
      img.onload = async () => {
        if (editorInstance.value === newEditor) {
          const imageComponent = await ImageComponent.fromImage(img, Mat33.identity);
          await newEditor.addAndCenterComponents([imageComponent]);
        }
      };
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
  margin: 0;
  width: 90vw;
  height: 90vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: #fff;
  text-align: center;
}

.protocol-images__lightbox-editor {
  width: 100%;
  flex-grow: 1;
  background: transparent;
  overflow: hidden;
  border-radius: 12px;
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.45);
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


.protocol-images__lightbox-copy {
  position: absolute;
  top: 18px;
  right: 74px;
  background: transparent;
  color: #fff;
  border: none;
  padding: 8px;
  cursor: pointer;
  transition: opacity 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.protocol-images__lightbox-copy:hover {
  opacity: 0.8;
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
