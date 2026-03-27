<script lang="ts">
  import { HugeiconsIcon } from "@hugeicons/svelte";
  import { MinusSignIcon, PlusSignIcon } from "@hugeicons/core-free-icons";
  import { Tween } from "svelte/motion";
  import { cubicOut } from "svelte/easing";
  import { Button } from "$lib/components/ui/button/index.js";
  import { cn } from "$lib/utils.js";

  type Props = {
    value?: number;
    min?: number;
    max?: number;
    step?: number;
    disabled?: boolean;
    "aria-invalid"?: boolean | "false" | "true" | undefined;
    "aria-labelledby"?: string;
    class?: string;
  };

  let {
    value = $bindable(1),
    min = 1,
    max = 14,
    step = 1,
    disabled = false,
    "aria-invalid": ariaInvalid,
    "aria-labelledby": ariaLabelledby,
    class: className,
  }: Props = $props();

  const display = Tween.of(() => value, {
    duration: 150,
    easing: cubicOut,
  });

  function decrement() {
    if (value - step >= min) value -= step;
  }

  function increment() {
    if (value + step <= max) value += step;
  }

  function onkeydown(event: KeyboardEvent) {
    switch (event.key) {
      case "ArrowUp":
      case "ArrowRight":
        event.preventDefault();
        increment();
        break;
      case "ArrowDown":
      case "ArrowLeft":
        event.preventDefault();
        decrement();
        break;
      case "Home":
        event.preventDefault();
        value = min;
        break;
      case "End":
        event.preventDefault();
        value = max;
        break;
    }
  }

  const atMin = $derived(value <= min);
  const atMax = $derived(value >= max);
</script>

<div
  class={cn("inline-flex items-center gap-1", className)}
  role="group"
  aria-labelledby={ariaLabelledby}
>
  <Button
    variant="outline"
    size="icon-sm"
    onclick={decrement}
    disabled={disabled || atMin}
    aria-label="Decrease value"
    tabindex={-1}
  >
    <HugeiconsIcon icon={MinusSignIcon} size={14} />
  </Button>

  <span
    role="spinbutton"
    tabindex={disabled ? -1 : 0}
    aria-valuenow={value}
    aria-valuemin={min}
    aria-valuemax={max}
    aria-invalid={ariaInvalid}
    aria-labelledby={ariaLabelledby}
    {onkeydown}
    class="min-w-8 rounded-md text-center text-sm font-medium tabular-nums select-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
  >
    {Math.round(display.current)}
  </span>

  <Button
    variant="outline"
    size="icon-sm"
    onclick={increment}
    disabled={disabled || atMax}
    aria-label="Increase value"
    tabindex={-1}
  >
    <HugeiconsIcon icon={PlusSignIcon} size={14} />
  </Button>
</div>
