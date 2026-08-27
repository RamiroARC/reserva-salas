# Design system — Material Design 3

Sistema visual de la app de reservas. La lógica de negocio vive fuera de esta carpeta.

## Tokens

`tokens.css` define roles MD3 (primary, surface-container, outline, etc.), escala tipográfica, forma, espacio de 8 dp, elevación y movimiento. El modo claro/oscuro se aplica con `data-theme` en `<html>`.

Los tokens legacy (`--primary`, `--surface`, `--text`) se mapean a MD3 para no romper pantallas antiguas.

## Componentes

| Componente | Uso |
|---|---|
| `Button` | filled, tonal, outlined, text, danger |
| `IconButton` | acciones de 40 dp |
| `FAB` | crear reserva en móvil |
| `Navigation` | tabs desktop + barra inferior + drawer |
| `Snackbar` | confirmaciones y errores |
| `Progress` | carga lineal o circular |
| `ThemeSwitch` | modo claro/oscuro |
| `Icon` | Material Symbols Outlined |

Las clases existentes (`.btn`, `.panel`, `.tabs`, inputs) heredan el look MD3 desde `components.css`.

## Accesibilidad

- Contraste de color según roles MD3 (WCAG AA).
- `:focus-visible` de 3 dp.
- Ripple/hover/pressed con opacidad 8% / 12%.
- Drawer y diálogos con `aria-modal`.
- Skip link al contenido principal.
