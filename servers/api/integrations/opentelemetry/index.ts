import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics'
import { NodeSDK } from '@opentelemetry/sdk-node'

export type OpenTelemetryIntegration = Readonly<{ shutdown: () => Promise<void> }>
type TelemetryConfiguration = Readonly<{ endpoint: string; headers?: string }>

const parseHeaders = (source: string | undefined): Readonly<Record<string, string>> => {
    if (!source) return Object.freeze({})
    const pairs = source.split(',').map((entry) => {
        const separator = entry.indexOf('=')
        if (separator < 1) throw new Error('OTEL_EXPORTER_OTLP_HEADERS must be comma-separated key=value pairs.')
        const key = decodeURIComponent(entry.slice(0, separator).trim())
        const value = decodeURIComponent(entry.slice(separator + 1).trim())
        if (!/^[A-Za-z0-9!#$%&'*+.^_`|~-]+$/.test(key) || !value) throw new Error('OTEL_EXPORTER_OTLP_HEADERS contains an invalid header.')
        return [key, value] as const
    })
    return Object.freeze(Object.fromEntries(pairs))
}

const endpointFor = (endpoint: string, signal: 'traces' | 'metrics'): string => `${endpoint.replace(/\/+$/, '')}/v1/${signal}`

export const createOpenTelemetryIntegration = (configuration?: TelemetryConfiguration): OpenTelemetryIntegration => {
    const headers = parseHeaders(configuration?.headers)
    const sdk = new NodeSDK(
        configuration
            ? {
                  serviceName: 'worklist-api',
                  traceExporter: new OTLPTraceExporter({ url: endpointFor(configuration.endpoint, 'traces'), headers }),
                  metricReaders: [
                      new PeriodicExportingMetricReader({
                          exporter: new OTLPMetricExporter({ url: endpointFor(configuration.endpoint, 'metrics'), headers }),
                          exportIntervalMillis: 15_000,
                          exportTimeoutMillis: 5_000
                      })
                  ]
              }
            : { serviceName: 'worklist-api', spanProcessors: [], metricReaders: [] }
    )
    sdk.start()
    return Object.freeze({ shutdown: () => sdk.shutdown() })
}
