<script lang="ts">
  import CalendarIcon from "@lucide/svelte/icons/calendar";
  import {
    DateFormatter,
    getLocalTimeZone,
    parseDateTime,
    type DateValue,
  } from "@internationalized/date";
  import { Button } from "$lib/components/ui/button";
  import { Calendar } from "$lib/components/ui/calendar";
  import { Input } from "$lib/components/ui/input";
  import * as Popover from "$lib/components/ui/popover";

  type Props = {
    value?: string;
    name?: string;
    placeholder?: string;
    required?: boolean;
  };

  let {
    value = $bindable(""),
    name,
    placeholder = "Select date and time",
    required = false,
  }: Props = $props();

  const df = new DateFormatter("en-US", {
    dateStyle: "medium",
  });

  // Parse ISO string to DateValue for Calendar
  let dateValue = $state<DateValue | undefined>(undefined);
  let timeValue = $state("12:00");

  // Sync from value prop
  $effect(() => {
    if (value) {
      try {
        const dt = parseDateTime(value.replace(" ", "T"));
        dateValue = dt;
        timeValue = `${String(dt.hour).padStart(2, "0")}:${String(dt.minute).padStart(2, "0")}`;
      } catch {
        // Invalid format, ignore
      }
    }
  });

  // Update value when date or time changes
  function updateValue() {
    if (dateValue) {
      const [hours, minutes] = timeValue.split(":").map(Number);
      const dt = dateValue.set({ hour: hours, minute: minutes });
      value = dt.toString().slice(0, 16); // "YYYY-MM-DDTHH:MM"
    }
  }

  $effect(() => {
    if (dateValue) {
      updateValue();
    }
  });

  function handleDateSelect(newDate: DateValue | undefined) {
    dateValue = newDate;
    updateValue();
  }
</script>

<input type="hidden" {name} {value} {required} />

<Popover.Root>
  <Popover.Trigger>
    {#snippet child({ props })}
      <Button
        variant="outline"
        class="w-full justify-start text-left font-normal {!dateValue &&
          'text-muted-foreground'}"
        {...props}
      >
        <CalendarIcon class="mr-2 size-4" />
        {#if dateValue}
          {df.format(dateValue.toDate(getLocalTimeZone()))} at {timeValue}
        {:else}
          {placeholder}
        {/if}
      </Button>
    {/snippet}
  </Popover.Trigger>
  <Popover.Content class="w-auto p-0" align="start">
    <Calendar
      type="single"
      value={dateValue}
      onValueChange={handleDateSelect}
      initialFocus
      captionLayout="dropdown"
    />
    <div class="border-t p-3">
      <Input
        type="time"
        bind:value={timeValue}
        onchange={updateValue}
        aria-label="Time"
      />
    </div>
  </Popover.Content>
</Popover.Root>
