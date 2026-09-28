<script lang="ts">
    import { language } from 'src/lang'
</script>

<div class="risu-mc-typing flex items-center gap-1.5 py-3" role="status" aria-label={language.mobileChat.typing}>
    <span class="dot"></span>
    <span class="dot" style="animation-delay: 0.16s"></span>
    <span class="dot" style="animation-delay: 0.32s"></span>
</div>

<style>
    .dot {
        width: 7px;
        height: 7px;
        border-radius: 9999px;
        background: var(--mc-text2);
        animation: risu-mc-typing 1.2s ease-in-out infinite;
    }
    @keyframes risu-mc-typing {
        0%, 80%, 100% { opacity: 0.3; transform: translateY(0); }
        40% { opacity: 1; transform: translateY(-3px); }
    }
    @media (prefers-reduced-motion: reduce) {
        .dot { animation: none; opacity: 0.6; }
    }
</style>
