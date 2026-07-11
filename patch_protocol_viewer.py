import re

with open('src/components/ProtocolViewer.vue', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove the hacky click handler for ...
content = re.sub(
    r"\s*// Xử lý click cho ô input `\.\.\.`.*?return;\s*}",
    "",
    content,
    flags=re.DOTALL
)

# 2. Add watch for props.current and props.selectedVersion
watch_import = "import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue';"
content = re.sub(
    r"import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';",
    watch_import,
    content
)

watch_logic = """
watch(() => [props.current, props.selectedVersion], () => {
  activeTab.value = 'interactive';
});

const emit = defineEmits(['update-draft']);
"""
content = re.sub(
    r"const emit = defineEmits\(\['update-draft'\]\);",
    watch_logic,
    content
)

with open('src/components/ProtocolViewer.vue', 'w', encoding='utf-8') as f:
    f.write(content)
