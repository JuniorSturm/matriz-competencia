import { useState } from 'react'
import { IconButton, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import { BRAND } from '../theme/ThemeProvider'

interface TableRowActionsMenuProps {
  onEdit?: () => void
  onDelete?: () => void
  canEdit?: boolean
  canDelete?: boolean
  editLabel?: string
  deleteLabel?: string
}

/**
 * Menu de ações para linhas de tabela. Em telas pequenas evita ícones pequenos;
 * um único botão "mais" abre opções Editar e Excluir com área de toque maior.
 */
export default function TableRowActionsMenu({
  onEdit,
  onDelete,
  canEdit = true,
  canDelete = true,
  editLabel = 'Editar',
  deleteLabel = 'Excluir',
}: TableRowActionsMenuProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  const handleOpen = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation()
    setAnchorEl(e.currentTarget)
  }

  const handleClose = () => setAnchorEl(null)

  const handleEdit = () => {
    onEdit?.()
    handleClose()
  }

  const handleDelete = () => {
    onDelete?.()
    handleClose()
  }

  const showMenu = (canEdit && onEdit) || (canDelete && onDelete)
  if (!showMenu) return null

  return (
    <>
      <IconButton
        size='small'
        onClick={handleOpen}
        aria-label='Abrir ações'
        aria-haspopup='true'
        aria-expanded={open ? 'true' : undefined}
        sx={{
          color: 'text.secondary',
          '&:hover': { bgcolor: 'action.hover' },
          // Área de toque maior em qualquer tela
          p: 1,
          minWidth: 40,
          minHeight: 40,
        }}
      >
        <MoreVertIcon fontSize='small' />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { minWidth: 160 } } }}
      >
        {canEdit && onEdit && (
          <MenuItem onClick={handleEdit}>
            <ListItemIcon>
              <EditIcon fontSize='small' sx={{ color: BRAND.cyan }} />
            </ListItemIcon>
            <ListItemText>{editLabel}</ListItemText>
          </MenuItem>
        )}
        {canDelete && onDelete && (
          <MenuItem onClick={handleDelete} sx={{ color: BRAND.error }}>
            <ListItemIcon>
              <DeleteIcon fontSize='small' />
            </ListItemIcon>
            <ListItemText>{deleteLabel}</ListItemText>
          </MenuItem>
        )}
      </Menu>
    </>
  )
}
