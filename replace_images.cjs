const fs = require('fs');
const file = 'src/components/ProtocolImages.vue';
let content = fs.readFileSync(file, 'utf8');

const oldLightbox = `<Teleport to="body">
      <div v-if="isOpen && activeImage" class="protocol-images__lightbox" @click.self="close">
        <button class="protocol-images__lightbox-close" type="button" @click="close" aria-label="Close">&times;</button>
        <button v-if="images.length > 1" class="protocol-images__lightbox-nav is-prev" type="button" @click.stop="prev"
          aria-label="Previous">&#8249;</button>
        <figure class="protocol-images__lightbox-figure">
          <img :src="activeImage.url" :alt="imageAlt(activeImage, activeIndex)" />
          <figcaption v-if="activeImage.description">\{\{ activeImage.description \}\}</figcaption>
        </figure>
        <button v-if="images.length > 1" class="protocol-images__lightbox-nav is-next" type="button" @click.stop="next"
          aria-label="Next">&#8250;</button>
      </div>
    </Teleport>`;

const newLightbox = `<Teleport to="body">
      <div v-if="isOpen && activeImage" class="protocol-images__lightbox" @click.self="close">
        <button class="protocol-images__lightbox-close" type="button" @click="close" aria-label="Close">&times;</button>
        <button class="protocol-images__lightbox-copy" type="button" @click="copyActiveImage" title="Copy Image">Copy Ảnh</button>

        <button v-if="images.length > 1" class="protocol-images__lightbox-nav is-prev" type="button" @click.stop="prev"
          aria-label="Previous">&#8249;</button>

        <figure class="protocol-images__lightbox-figure">
          <img :src="activeImage.url" :alt="imageAlt(activeImage, activeIndex)" crossorigin="anonymous" />
          <figcaption v-if="activeImage.description">\{\{ activeImage.description \}\}</figcaption>

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
    </Teleport>`;

content = content.replace(oldLightbox, newLightbox);

const copyFunction = `
async function copyActiveImage() {
  if (!activeImage.value) return;
  try {
    const response = await fetch(activeImage.value.url, { mode: 'cors' });
    if (!response.ok) throw new Error('Network response was not ok');
    const blob = await response.blob();

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
`;

content = content.replace(/function open\(index\) \{/, copyFunction + '\nfunction open(index) {');

const stylesToAdd = `
.protocol-images__lightbox-copy {
  position: absolute;
  top: 18px;
  right: 74px;
  background: rgba(15, 23, 42, 0.75);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.protocol-images__lightbox-copy:hover {
  background: rgba(15, 23, 42, 0.95);
}

.protocol-images__thumbnails {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 16px;
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
}`;

content += stylesToAdd;

fs.writeFileSync(file, content);
