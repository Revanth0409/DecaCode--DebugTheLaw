import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import L from 'leaflet'
import { MapContainer, TileLayer, Polygon, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { getAllParcels } from '@/services/dataService'
import type { LandParcel, VerificationStatus } from '@/types'

// Fix Leaflet default marker icon paths broken by Vite bundling
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const STATUS_COLORS: Record<VerificationStatus, string> = {
  verified: '#16a34a',
  pending: '#d97706',
  discrepancy: '#dc2626',
  disputed: '#9333ea',
}

const STATUS_FILL: Record<VerificationStatus, string> = {
  verified: '#bbf7d0',
  pending: '#fef3c7',
  discrepancy: '#fee2e2',
  disputed: '#f3e8ff',
}

interface MapProps {
  height?: string
  filterStatus?: VerificationStatus | 'all'
  showLegend?: boolean
}

// Fits map bounds to show all parcels on first render
function FitBounds({ parcels }: { parcels: LandParcel[] }) {
  const map = useMap()
  useEffect(() => {
    const allPoints = parcels.flatMap(p => p.geometry ?? [])
    if (allPoints.length > 0) {
      map.fitBounds(allPoints as [number, number][], { padding: [30, 30] })
    }
  }, [parcels, map])
  return null
}

export default function LandMap({ height = '500px', filterStatus = 'all', showLegend = true }: MapProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [parcels, setParcels] = useState<LandParcel[]>([])

  useEffect(() => {
    const all = getAllParcels()
    setParcels(filterStatus === 'all' ? all : all.filter(p => p.verificationStatus === filterStatus))
  }, [filterStatus])

  const validParcels = parcels.filter(p => Array.isArray(p.geometry) && p.geometry.length >= 3)

  const legend = [
    { status: 'verified' as VerificationStatus, label: t('common.verified') },
    { status: 'pending' as VerificationStatus, label: t('common.pending') },
    { status: 'discrepancy' as VerificationStatus, label: t('common.discrepancy') },
    { status: 'disputed' as VerificationStatus, label: t('common.disputed') },
  ]

  return (
    <div className="relative rounded-xl overflow-hidden border shadow-md" style={{ height }}>
      <MapContainer
        center={[12.97, 77.59]}
        zoom={11}
        style={{ width: '100%', height: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {validParcels.length > 0 && <FitBounds parcels={validParcels} />}

        {validParcels.map(parcel => (
          <Polygon
            key={parcel.id}
            positions={parcel.geometry as [number, number][]}
            pathOptions={{
              color: STATUS_COLORS[parcel.verificationStatus],
              fillColor: STATUS_FILL[parcel.verificationStatus],
              fillOpacity: 0.55,
              weight: 2.5,
            }}
          >
            <Popup>
              <div style={{ minWidth: 210, fontFamily: 'Inter, sans-serif' }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6, color: '#1e3a5f' }}>
                  Survey {parcel.surveyNumber}
                </div>
                <div style={{ fontSize: 12, color: '#555', marginBottom: 3 }}>👤 {parcel.currentRecordedOwner}</div>
                <div style={{ fontSize: 12, color: '#555', marginBottom: 3 }}>📍 {parcel.village}, {parcel.district}</div>
                <div style={{ fontSize: 12, color: '#555', marginBottom: 3 }}>📐 {parcel.area} {parcel.areaUnit}</div>
                <div style={{ fontSize: 12, color: '#555', marginBottom: 8 }}>🏷️ {parcel.classification}</div>
                <div style={{
                  display: 'inline-block', padding: '2px 10px', borderRadius: 9999,
                  fontSize: 11, fontWeight: 600,
                  background: STATUS_FILL[parcel.verificationStatus],
                  color: STATUS_COLORS[parcel.verificationStatus],
                  border: `1px solid ${STATUS_COLORS[parcel.verificationStatus]}`,
                  marginBottom: 10,
                }}>
                  {parcel.verificationStatus.toUpperCase()}
                </div>
                <br />
                <button
                  onClick={() => navigate(`/land-records/${parcel.id}`)}
                  style={{
                    background: '#1e3a5f', color: 'white', border: 'none',
                    padding: '7px 12px', borderRadius: 6, cursor: 'pointer',
                    fontSize: 12, marginTop: 4, width: '100%', fontWeight: 500,
                  }}
                >
                  View Full Details →
                </button>
              </div>
            </Popup>
          </Polygon>
        ))}
      </MapContainer>

      {/* Legend overlay */}
      {showLegend && (
        <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-3 z-[1000] pointer-events-none">
          <div className="text-xs font-semibold text-gray-700 mb-2">Legend</div>
          <div className="space-y-1.5">
            {legend.map(l => (
              <div key={l.status} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-sm border"
                  style={{ background: STATUS_FILL[l.status], borderColor: STATUS_COLORS[l.status] }}
                />
                <span className="text-xs text-gray-600">{l.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 pt-2 border-t text-[10px] text-gray-400">Illustrative sample data</div>
        </div>
      )}

      {/* Parcel count badge */}
      <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-md px-2.5 py-1 shadow text-xs font-medium text-gray-600 z-[1000] pointer-events-none">
        {validParcels.length} parcels shown
      </div>
    </div>
  )
}
