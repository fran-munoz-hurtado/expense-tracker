interface CategoryOriginLabelProps {
  isDefault: boolean
}

export default function CategoryOriginLabel({ isDefault }: CategoryOriginLabelProps) {
  return (
    <span className="text-xs text-gray-400">
      {isDefault ? 'Predeterminada' : 'Creada por ti'}
    </span>
  )
} 