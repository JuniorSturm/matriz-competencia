import { memo, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Box, Button, TextField, Typography, Paper, CircularProgress, Alert,
  Divider, FormControl, InputLabel, Select, MenuItem, Checkbox, ListItemText,
  OutlinedInput, Chip, FormHelperText,
  Avatar, Tabs, Tab, Snackbar,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import SaveIcon from '@mui/icons-material/Save'
import SchoolIcon from '@mui/icons-material/School'
import { useSkill, useCreateSkill, useUpdateSkill, useSkillDescriptions, useUpsertDescription, useSkillExpectations, useUpsertExpectation } from '../hooks/useSkills'
import { useCategories, useRolesByCompany, useNiveis } from '../hooks/useRoleGrade'
import { useCompanies } from '../hooks/useCompanies'
import { useAuth } from '../hooks/useAuth'
import type { CreateSkillRequest, CompetencyLevel } from '../types'
import { LEVELS } from '../types'
import { skillService } from '../services/skillService'
import PageHeader from '../components/PageHeader'
import { BRAND } from '../theme/ThemeProvider'

const DESC_LEVELS = ['BRONZE', 'PRATA', 'OURO'] as const

interface DescriptionEditorProps {
  roleId: number
  level: (typeof DESC_LEVELS)[number]
  value: string
  submitted: boolean
  onCommit: (roleId: number, level: (typeof DESC_LEVELS)[number], value: string) => void
}

const DescriptionEditor = memo(function DescriptionEditor({
  roleId,
  level,
  value,
  submitted,
  onCommit,
}: DescriptionEditorProps) {
  const [text, setText] = useState(value)

  useEffect(() => {
    setText(value)
  }, [value])

  const trimmed = text.trim()

  return (
    <TextField
      label={`Descrição — ${level}`}
      multiline
      minRows={6}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => onCommit(roleId, level, text)}
      fullWidth
      size='small'
      required
      error={submitted && !trimmed}
      inputProps={{ maxLength: 5000 }}
      helperText={submitted && !trimmed ? 'Campo obrigatório' : `${text.length}/5000`}
      sx={{ mt: 0 }}
    />
  )
})

export default function SkillFormPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { id } = useParams<{ id: string }>()
  const skillId = id ? Number(id) : null
  const isEdit = skillId !== null

  const isAdmin = user?.isAdmin ?? false
  const userCompanyId = user?.companyId ?? null

  const { data: existingSkill, isLoading: loadingSkill } = useSkill(skillId)
  const { data: descriptions, isLoading: descLoading } = useSkillDescriptions(skillId)
  const { data: expectations } = useSkillExpectations(skillId)
  const { data: categories } = useCategories()
  const [form, setForm] = useState<{ name: string; category: string; companyId: number | null }>({
    name: '',
    category: '',
    companyId: isAdmin ? null : userCompanyId,
  })
  const companyIdForRoles = form.companyId ?? user?.companyId ?? null
  const { data: roles } = useRolesByCompany(companyIdForRoles)
  const { data: niveis } = useNiveis()
  const { data: companies } = useCompanies()

  const createMutation = useCreateSkill()
  const updateMutation = useUpdateSkill()
  const upsertDescMutation = useUpsertDescription()
  const upsertExpMutation = useUpsertExpectation()
  const [descForm, setDescForm] = useState<Record<number, Record<string, string>>>({})
  const [descTabByRole, setDescTabByRole] = useState<Record<number, number>>({})
  const [cargoTabIndex, setCargoTabIndex] = useState(0)
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([])
  const [roleGradeLevels, setRoleGradeLevels] = useState<Record<number, Record<number, CompetencyLevel | ''>>>({})
  const [synced, setSynced] = useState(false)
  const [descSynced, setDescSynced] = useState(false)
  const [expSynced, setExpSynced] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [validationErrorMsg, setValidationErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (isEdit && existingSkill && !synced) {
      setForm({ name: existingSkill.name, category: existingSkill.category, companyId: existingSkill.companyId })
      setSynced(true)
    }
  }, [isEdit, existingSkill, synced])

  useEffect(() => {
    if (descriptions && !descSynced) {
      const map: Record<number, Record<string, string>> = {}
      for (const d of descriptions) {
        if (!map[d.roleId]) map[d.roleId] = {}
        map[d.roleId][d.level] = d.description
      }
      setDescForm(map)
      setDescSynced(true)
    }
  }, [descriptions, descSynced])

  useEffect(() => {
    if (expectations && !expSynced) {
      const roleIds = new Set<number>()
      const rgl: Record<number, Record<number, CompetencyLevel | ''>> = {}
      for (const e of expectations) {
        roleIds.add(e.roleId)
        if (!rgl[e.roleId]) rgl[e.roleId] = {}
        rgl[e.roleId][e.gradeId] = e.expectedLevel
      }
      setSelectedRoleIds(Array.from(roleIds))
      setRoleGradeLevels(rgl)
      setExpSynced(true)
    }
  }, [expectations, expSynced])

  const sortedGrades = niveis ? [...niveis].sort((a, b) => a.ordinal - b.ordinal) : []

  const handleRoleToggle = (roleIds: number[]) => {
    setSelectedRoleIds(roleIds)
    const updated = { ...roleGradeLevels }
    const updatedDesc = { ...descForm }
    for (const rid of roleIds) {
      if (!updated[rid]) updated[rid] = {}
      if (!updatedDesc[rid]) updatedDesc[rid] = {}
    }
    setRoleGradeLevels(updated)
    setDescForm(updatedDesc)
  }

  const handleGradeLevel = (roleId: number, gradeId: number, level: CompetencyLevel | '') => {
    setRoleGradeLevels((prev) => ({
      ...prev,
      [roleId]: { ...(prev[roleId] || {}), [gradeId]: level },
    }))
  }

  const hasMissingGrades = (roleId: number) =>
    sortedGrades.some((g) => !roleGradeLevels[roleId]?.[g.id])

  const hasMissingDescs = (roleId: number) =>
    DESC_LEVELS.some((lvl) => !(descForm[roleId]?.[lvl] ?? '').trim())

  const hasRoleErrors = selectedRoleIds.some((rid) => hasMissingGrades(rid) || hasMissingDescs(rid))

  const handleSave = async () => {
    setSubmitted(true)
    setValidationErrorMsg(null)
    if (!form.name.trim() || !form.category) return
    if (selectedRoleIds.length === 0) return
    if (hasRoleErrors) {
      let firstErrorRoleIdx = 0
      const descTabUpdates: Record<number, number> = {}
      const messageParts: string[] = []
      for (let i = 0; i < selectedRoleIds.length; i++) {
        const roleId = selectedRoleIds[i]
        const role = roles?.find((r) => r.id === roleId)
        const roleName = role?.nome ?? `Cargo ${roleId}`
        const missingGrades = sortedGrades.filter((g) => !roleGradeLevels[roleId]?.[g.id])
        const missingDescs = DESC_LEVELS.filter((l) => !(descForm[roleId]?.[l] ?? '').trim())
        if (missingGrades.length > 0 || missingDescs.length > 0) {
          if (messageParts.length === 0) firstErrorRoleIdx = i
          const roleParts: string[] = []
          if (missingGrades.length > 0) roleParts.push(`nível esperado (${missingGrades.map((g) => g.nome).join(', ')})`)
          if (missingDescs.length > 0) {
            roleParts.push(`descrição ${missingDescs.join(', ')}`)
            if (descTabUpdates[roleId] === undefined) {
              const idx = DESC_LEVELS.findIndex((l) => !(descForm[roleId]?.[l] ?? '').trim())
              if (idx >= 0) descTabUpdates[roleId] = idx
            }
          }
          messageParts.push(`Aba "${roleName}": ${roleParts.join('; ')}`)
        }
      }
      setCargoTabIndex(firstErrorRoleIdx)
      setDescTabByRole((prev) => ({ ...prev, ...descTabUpdates }))
      setValidationErrorMsg(`Preencha os campos obrigatórios. ${messageParts.join('. ')}`)
      return
    }
    if (!isEdit && !form.companyId) return

    let savedSkillId = skillId

    if (isEdit && skillId) {
      await updateMutation.mutateAsync({ id: skillId, data: { name: form.name, category: form.category } })
      savedSkillId = skillId
    } else {
      const request: CreateSkillRequest = {
        name: form.name,
        category: form.category,
        companyId: form.companyId,
      }
      savedSkillId = await createMutation.mutateAsync(request)
    }

    if (!savedSkillId) return

    const originalDescMap: Record<number, Record<string, string>> = {}
    if (descriptions) {
      for (const d of descriptions) {
        if (!originalDescMap[d.roleId]) originalDescMap[d.roleId] = {}
        originalDescMap[d.roleId][d.level] = d.description
      }
    }
    for (const roleId of selectedRoleIds) {
      for (const level of DESC_LEVELS) {
        const val = (descForm[roleId]?.[level] ?? '').trim()
        const original = originalDescMap[roleId]?.[level] ?? ''
        if (val !== original) {
          await upsertDescMutation.mutateAsync({ skillId: savedSkillId, roleId, level, description: val })
        }
      }
    }

    if (expectations) {
      for (const e of expectations) {
        if (!selectedRoleIds.includes(e.roleId)) {
          await skillService.deleteExpectation(savedSkillId, e.roleId, e.gradeId)
        }
      }
    }

    for (const roleId of selectedRoleIds) {
      const gradeMap = roleGradeLevels[roleId] || {}
      const originalExpMap: Record<number, CompetencyLevel> = {}
      if (expectations) {
        for (const e of expectations) {
          if (e.roleId === roleId) originalExpMap[e.gradeId] = e.expectedLevel
        }
      }

      for (const grade of sortedGrades) {
        const newVal = gradeMap[grade.id] || ''
        const origVal = originalExpMap[grade.id] || ''

        if (newVal && newVal !== origVal) {
          await upsertExpMutation.mutateAsync({
            skillId: savedSkillId,
            roleId,
            gradeId: grade.id,
            expectedLevel: newVal as CompetencyLevel,
            isRequired: false,
          })
        } else if (!newVal && origVal) {
          await skillService.deleteExpectation(savedSkillId, roleId, grade.id)
        }
      }
    }

    navigate('/skills')
  }

  const handleCancel = () => navigate('/skills')

  const isSaving = createMutation.isPending || updateMutation.isPending || upsertDescMutation.isPending || upsertExpMutation.isPending

  if (isEdit && loadingSkill) return <CircularProgress />
  if (isEdit && !existingSkill && !loadingSkill) return <Alert severity='error'>Competência não encontrada.</Alert>

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 112px)', minWidth: 0 }}>
      <PageHeader>
        <Box display='flex' alignItems='center' gap={1}>
          <Button startIcon={<ArrowBackIcon />} onClick={handleCancel} color='inherit'>
            Voltar
          </Button>
          <Typography variant='h5' fontWeight={700}>
            {isEdit ? 'Editar Competência' : 'Nova Competência'}
          </Typography>
        </Box>
      </PageHeader>

      <Box sx={{ flex: 1, mb: '80px' }}>
        <Paper sx={{ p: 3, borderRadius: '16px', mb: 3 }}>
          <Box display='flex' alignItems='center' gap={1.5} mb={2.5}>
            <Avatar sx={{ bgcolor: alpha(BRAND.cyan, 0.15), color: BRAND.cyan }}>
              <SchoolIcon />
            </Avatar>
            <Typography variant='h6' fontWeight={600}>Dados da Competência</Typography>
          </Box>
          <Box display='flex' flexDirection='column' gap={2.5}>
            {!isEdit && isAdmin && (
            <FormControl fullWidth required error={submitted && !form.companyId}>
              <InputLabel>Empresa</InputLabel>
              <Select
                label='Empresa'
                value={form.companyId ?? ''}
                onChange={(e) => setForm({ ...form, companyId: e.target.value ? Number(e.target.value) : null })}
              >
                <MenuItem value=''><em>Selecione</em></MenuItem>
                {companies?.map((c) => (
                  <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                ))}
              </Select>
              {submitted && !form.companyId && <FormHelperText>Campo obrigatório</FormHelperText>}
            </FormControl>
          )}

          <TextField
            label='Nome'
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            fullWidth
            required
            error={submitted && !form.name.trim()}
            helperText={submitted && !form.name.trim() ? 'Campo obrigatório' : ''}
          />
          <FormControl fullWidth required error={submitted && !form.category}>
            <InputLabel>Categoria</InputLabel>
            <Select
              value={form.category}
              label='Categoria'
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {categories?.map((c) => (
                <MenuItem key={c.id} value={c.nome}>{c.nome}</MenuItem>
              ))}
            </Select>
            {submitted && !form.category && <FormHelperText>Campo obrigatório</FormHelperText>}
          </FormControl>

          <Divider sx={{ mt: 1 }} />
          <Typography variant='subtitle2' fontWeight={600} color='text.secondary'>
            Cargos e Nível Esperado por Graduação
          </Typography>

          <FormControl fullWidth required error={submitted && selectedRoleIds.length === 0}>
            <InputLabel>Cargos</InputLabel>
            <Select
              multiple
              value={selectedRoleIds}
              onChange={(e) => handleRoleToggle(e.target.value as number[])}
              input={<OutlinedInput label='Cargos' />}
              MenuProps={{ transitionDuration: 0 }}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(selected as number[]).map((rid) => {
                    const role = roles?.find((r) => r.id === rid)
                    return <Chip key={rid} label={role?.nome ?? rid} size='small' />
                  })}
                </Box>
              )}
            >
              {roles?.map((r) => (
                <MenuItem key={r.id} value={r.id}>
                  <Checkbox checked={selectedRoleIds.includes(r.id)} />
                  <ListItemText primary={r.nome} />
                </MenuItem>
              ))}
            </Select>
            {submitted && selectedRoleIds.length === 0 && <FormHelperText>Selecione ao menos 1 cargo</FormHelperText>}
          </FormControl>

          {selectedRoleIds.length > 0 && sortedGrades.length > 0 && (
            <Box>
              <Tabs
                value={Math.min(cargoTabIndex, selectedRoleIds.length - 1)}
                onChange={(_, v: number) => setCargoTabIndex(v)}
                sx={{ borderBottom: 1, borderColor: 'divider', mb: 2, minHeight: 44 }}
                TabIndicatorProps={{ sx: { transition: 'none' } }}
              >
                {selectedRoleIds.map((roleId, idx) => {
                  const role = roles?.find((r) => r.id === roleId)
                  return (
                    <Tab
                      key={roleId}
                      label={role?.nome ?? `Cargo ${roleId}`}
                      id={`cargo-tab-${idx}`}
                      aria-controls={`cargo-panel-${idx}`}
                      sx={{ minHeight: 44, py: 1.5 }}
                      disableRipple
                    />
                  )
                })}
              </Tabs>
              {selectedRoleIds.map((roleId, idx) => {
                const activeCargoIdx = Math.min(cargoTabIndex, selectedRoleIds.length - 1)
                if (idx !== activeCargoIdx) return null
                const role = roles?.find((r) => r.id === roleId)
                return (
                  <Box key={roleId} role='tabpanel' id={`cargo-panel-${idx}`} aria-labelledby={`cargo-tab-${idx}`}>
                    <Typography variant='subtitle2' fontWeight={600} color='text.secondary' sx={{ mb: 1.5 }}>
                      Nível esperado por graduação — {role?.nome ?? `Cargo ${roleId}`}
                    </Typography>
                    <Box display='flex' gap={2} flexWrap='wrap'>
                      {sortedGrades.map((grade) => {
                        const val = roleGradeLevels[roleId]?.[grade.id] ?? ''
                        return (
                          <FormControl key={grade.id} sx={{ minWidth: 140, flex: 1 }} required error={submitted && !val}>
                            <InputLabel>{grade.nome}</InputLabel>
                            <Select
                              value={val}
                              label={grade.nome}
                              onChange={(e) =>
                                handleGradeLevel(roleId, grade.id, e.target.value as CompetencyLevel | '')
                              }
                              size='small'
                            >
                              <MenuItem value=''><em>—</em></MenuItem>
                              {LEVELS.map((l) => (
                                <MenuItem key={l} value={l}>{l}</MenuItem>
                              ))}
                            </Select>
                            {submitted && !val && <FormHelperText>Obrigatório</FormHelperText>}
                          </FormControl>
                        )
                      })}
                    </Box>

                    <Divider sx={{ my: 2 }} />
                    <Typography variant='subtitle2' fontWeight={600} color='text.secondary' sx={{ mb: 1 }}>
                      Descrições por Nível
                    </Typography>
                    {isEdit && descLoading && !descSynced ? (
                      <CircularProgress size={24} sx={{ alignSelf: 'center' }} />
                    ) : (
                      <Box>
                        <Tabs
                          value={descTabByRole[roleId] ?? 0}
                          onChange={(_, v: number) => setDescTabByRole((prev) => ({ ...prev, [roleId]: v }))}
                          sx={{ borderBottom: 1, borderColor: 'divider', mb: 2, minHeight: 40 }}
                          TabIndicatorProps={{ sx: { transition: 'none' } }}
                        >
                          {DESC_LEVELS.map((level, idxLvl) => (
                            <Tab
                              key={level}
                              label={level}
                              id={`desc-tab-${roleId}-${idxLvl}`}
                              aria-controls={`desc-panel-${roleId}-${idxLvl}`}
                              sx={{ minHeight: 40, py: 1 }}
                              disableRipple
                            />
                          ))}
                        </Tabs>
                        {DESC_LEVELS.map((level, idxLvl) => {
                          const text = descForm[roleId]?.[level] ?? ''
                          const isActive = (descTabByRole[roleId] ?? 0) === idxLvl
                          if (!isActive) return null
                          return (
                            <Box key={level} role='tabpanel' id={`desc-panel-${roleId}-${idxLvl}`} aria-labelledby={`desc-tab-${roleId}-${idxLvl}`}>
                              <DescriptionEditor
                                roleId={roleId}
                                level={level}
                                value={text}
                                submitted={submitted}
                                onCommit={(rid, lvl, val) =>
                                  setDescForm((prev) => ({
                                    ...prev,
                                    [rid]: { ...(prev[rid] || {}), [lvl]: val },
                                  }))
                                }
                              />
                            </Box>
                          )
                        })}
                      </Box>
                    )}
                  </Box>
                )
              })}
            </Box>
          )}
          </Box>
        </Paper>
      </Box>

      <Paper
        elevation={0}
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 260,
          right: 0,
          px: 3,
          py: 1.5,
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 2,
          zIndex: (t) => t.zIndex.appBar - 1,
          borderRadius: 0,
          bgcolor: (t) => alpha(t.palette.background.paper, 0.9),
          backdropFilter: 'blur(12px)',
          borderTop: (t) => `1px solid ${t.palette.divider}`,
        }}
      >
        <Button onClick={handleCancel}>Cancelar</Button>
        <Button
          variant='contained'
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={isSaving}
        >
          Salvar
        </Button>
      </Paper>

      <Snackbar
        open={!!validationErrorMsg}
        autoHideDuration={12000}
        onClose={() => setValidationErrorMsg(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{ mt: 2 }}
      >
        <Alert severity='warning' variant='filled' onClose={() => setValidationErrorMsg(null)}>
          {validationErrorMsg}
        </Alert>
      </Snackbar>
    </Box>
  )
}
