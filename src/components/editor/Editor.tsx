import { Suspense } from 'react'
import Toolbar from './Toolbar'
import Viewport from './Viewport'
import PropertiesPanel from './PropertiesPanel'
import AssetLibrary from './AssetLibrary'
import SharePanel from './SharePanel'
import { useEditorStore } from '../../stores/editorStore'

export default function Editor() {
  const panelVisible = useEditorStore((s) => s.panelVisible)

  return (
    <div className="h-full w-full flex flex-col min-h-0">
      <Toolbar />
      <main className="flex-1 relative flex min-h-0 overflow-hidden">
        <Suspense fallback={<div className="h-full w-full flex items-center justify-center text-gray-500">Loading 3D...</div>}>
          <Viewport />
        </Suspense>
        {panelVisible && <PropertiesPanel />}
        <AssetLibrary />
        <SharePanel />
      </main>
    </div>
  )
}
