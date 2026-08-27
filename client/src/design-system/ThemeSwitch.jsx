import { useTheme } from './ThemeProvider';

export default function ThemeSwitch() {
  const { isDark, toggle } = useTheme();

  return (
    <button
      type="button"
      className="md-switch"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      onClick={toggle}
    />
  );
}
