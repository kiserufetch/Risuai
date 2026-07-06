<!-- <input
    class="text-textcolor bg-transparent input-text"
    class:mb-4={marginBottom}
    type="range"
    min={min}
    max={max}
    step={step}
    bind:value
    onchange
> -->

<div class="w-full flex items-center" class:mb-4={marginBottom}>
  {#if disableable}

    <div class="flex justify-center items-center mr-3">
      <CheckInput check={value !== -1000 && value !== undefined} margin={false} onChange={(c) => {
        onchange?.()
        if(c) {
          value = min;
        } else {
          value = -1000;
        }
      }}></CheckInput>
    </div>
  {/if}
  <div 
    role="slider"
    tabindex="0"
    aria-valuemin={min}
    aria-valuemax={max}
    aria-valuenow={sliderValue}
    aria-valuetext={displayText}
    class="relative flex-1 min-w-0 h-11 flex items-center cursor-pointer rounded-full focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500/60"
    onpointerdown={(event) => {
      mouseDown = true;
      changeValue(event);
    }}

    onpointermove={(event) => {
      if (mouseDown) {
        changeValue(event);
      }
    }}


    onpointerup={() => {
      mouseDown = false;
    }}

    onpointerleave={() => {
      mouseDown = false;
    }}
    onkeydown={handleKeydown}
    bind:this={slider}
  >
    <div
      class="w-full h-2 rounded-full pointer-events-none"
      style:background={
        `linear-gradient(to right, var(--risu-theme-primary-600) 0%, var(--risu-theme-primary-600) ${sliderPercent}%, var(--risu-theme-darkbutton) ${sliderPercent}%, var(--risu-theme-darkbutton) 100%)`
      }
    ></div>
    <span
      class="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white shadow-md pointer-events-none transition-shadow duration-200"
      style:left={`calc(${sliderPercent}% - ${sliderPercent / 100 * 1.25}rem)`}
    ></span>
  </div>
  <span class="ml-3 shrink-0 text-textcolor text-sm">
    {displayText}
  </span>
</div>


<script lang="ts">
  import { language } from "src/lang";
  import CheckInput from "./CheckInput.svelte";

    let slider: HTMLDivElement = $state()
    let mouseDown = $state(false)
  interface Props {
    min?: number;
    max?: number;
    value: number;
    marginBottom?: boolean;
    step?: number;
    fixed?: number;
    multiple?: number;
    disableable?: boolean;
    customText?: string|undefined;
    onchange?: Function;
  }

  let {
    min = undefined,
    max = undefined,
    value = $bindable(),
    marginBottom = false,
    step = 1,
    fixed = 0,
    multiple = 1,
    disableable = false,
    customText = undefined,
    onchange
  }: Props = $props();

  let isDisabledValue = $derived(value === -1000 || value === undefined);
  let sliderValue = $derived(isDisabledValue ? min : value);
  let sliderPercent = $derived((sliderValue - min) / (max - min) * 100);
  let displayText = $derived(customText === undefined ? (isDisabledValue ? language.disabled : (value * multiple).toFixed(fixed)) : customText);

    function changeValue(event: PointerEvent) {
        const rect = slider.getBoundingClientRect();
        const x = event.clientX - rect.left;
        console.log(x, rect.width);
        let newValue = ((x / rect.width) * (max - min)) + min;
        newValue = Math.round(newValue / step) * step;
        value = Math.min(Math.max(newValue, min), max);
    }

    function handleKeydown(event: KeyboardEvent) {
        let newValue = isDisabledValue ? min : value;

        switch (event.key) {
            case 'ArrowLeft':
            case 'ArrowDown':
                newValue -= step;
                break;
            case 'ArrowRight':
            case 'ArrowUp':
                newValue += step;
                break;
            case 'Home':
                newValue = min;
                break;
            case 'End':
                newValue = max;
                break;
            default:
                return;
        }

        event.preventDefault();
        value = Math.min(Math.max(newValue, min), max);
    }
</script>
