import { Tooltip } from '@mui/material'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'

export default function InfoTip({ title }: { title: string }) {
  return (
    <Tooltip
      title={title}
      arrow
      placement='top'
      slotProps={{ tooltip: { sx: { maxWidth: 360, fontSize: '0.8rem', lineHeight: 1.5 } } }}
    >
      <InfoOutlinedIcon
        sx={{
          fontSize: 16,
          ml: 0.5,
          color: 'text.disabled',
          cursor: 'help',
          verticalAlign: 'middle',
        }}
      />
    </Tooltip>
  )
}

