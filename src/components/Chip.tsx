import './Chip.css'

type ChipProps = {
  label: string
  selected?: boolean
  onClick?: () => void
}

export default function Chip({ label, selected, onClick }: ChipProps) {
  return (
    <button
      type="button"
      className={'chip' + (selected ? ' chip-selected' : '')}
      onClick={onClick}
      aria-pressed={!!selected}
    >
      {label}
    </button>
  )
}
