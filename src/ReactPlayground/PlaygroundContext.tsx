import { PropsWithChildren, createContext, useEffect, useState } from 'react'
import { compress, fileName2Language, uncompress } from './utils'
import { initFiles } from './files'
import { AI_MODELS, aiService } from './services/AIService'

export interface File {
  name: string
  value: string
  language: string
}

export interface Files {
  [key: string]: File
}

export interface PlaygroundContext {
  files: Files
  selectedFileName: string
  theme: Theme
  currentModelId: string
  showAISidebar: boolean
  isDiffMode: boolean
  pendingCode: string | null
  setTheme: (theme: Theme) => void
  setSelectedFileName: (fileName: string) => void
  setFiles: (files: Files) => void
  addFile: (fileName: string) => void
  removeFile: (fileName: string) => void
  updateFileName: (oldFieldName: string, newFieldName: string) => void
  setCurrentModelId: (modelId: string) => void
  toggleAISidebar: () => void
  setDiffMode: (isDiffMode: boolean, pendingCode?: string | null) => void
}

export type Theme = 'light' | 'dark'

export const PlaygroundContext = createContext<PlaygroundContext>({
  selectedFileName: 'App.tsx',
  currentModelId: AI_MODELS[0].id,
  showAISidebar: false,
  isDiffMode: false,
  pendingCode: null,
} as PlaygroundContext)

const getFilesFromUrl = () => {
  let files: Files | undefined
  try {
      const hash = uncompress(window.location.hash.slice(1))
      files = JSON.parse(hash)
  } catch (error) {
    console.error(error)
  }
  return files
}

export const PlaygroundProvider = (props: PropsWithChildren) => {
  const { children } = props
  const [files, setFiles] = useState<Files>( getFilesFromUrl() || initFiles)
  const [selectedFileName, setSelectedFileName] = useState('App.tsx');
  const [theme, setTheme] = useState<Theme>('light')
  const [currentModelId, setCurrentModelId] = useState<string>(AI_MODELS[0].id)
  // 明确将侧栏初始状态设置为关闭
  const [showAISidebar, setShowAISidebar] = useState<boolean>(false)
  // 差异编辑模式状态
  const [isDiffMode, setIsDiffMode] = useState<boolean>(false)
  // 待应用的代码
  const [pendingCode, setPendingCode] = useState<string | null>(null)
  
  // 确保初始状态为关闭
  useEffect(() => {
    console.log('初始化侧栏状态:', showAISidebar)
    // 强制重置侧栏状态为关闭
    setShowAISidebar(false)
  }, [])

  const addFile = (name: string) => {
    files[name] = {
      name,
      language: fileName2Language(name),
      value: '',
    }
    setFiles({ ...files })
  }

  const removeFile = (name: string) => {
    delete files[name]
    setFiles({ ...files })
  }

  const updateFileName = (oldFieldName: string, newFieldName: string) => {
    if (!files[oldFieldName] || newFieldName === undefined || newFieldName === null) return
    const { [oldFieldName]: value, ...rest } = files
    const newFile = {
      [newFieldName]: {
        ...value,
        language: fileName2Language(newFieldName),
        name: newFieldName,
      },
    }
    setFiles({
      ...rest,
      ...newFile,
    })
  }

  useEffect(() => {
    const hash = compress(JSON.stringify(files))
    window.location.hash = hash
  }, [files])
  
  // 当模型 ID 变化时，更新 AI 服务中的当前模型
  useEffect(() => {
    aiService.setCurrentModel(currentModelId);
  }, [currentModelId])

  const toggleAISidebar = () => {
    setShowAISidebar(prev => !prev);
  }
  
  // 设置差异编辑模式
  const setDiffMode = (isDiffMode: boolean, newPendingCode: string | null = null) => {
    setIsDiffMode(isDiffMode);
    setPendingCode(newPendingCode);
  }

  return (
    <PlaygroundContext.Provider
      value={{
        theme,
        setTheme,
        files,
        selectedFileName,
        setSelectedFileName,
        setFiles,
        addFile,
        removeFile,
        updateFileName,
        currentModelId,
        setCurrentModelId,
        showAISidebar,
        toggleAISidebar,
        isDiffMode,
        pendingCode,
        setDiffMode
      }}
    >
      {children}
    </PlaygroundContext.Provider>
  )
}
