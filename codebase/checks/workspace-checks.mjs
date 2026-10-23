import { createExecutionPlan, listTasks } from '../execution/tasks.mjs'
import { createDependencyGraph } from '../graph/dependency-graph.mjs'
import { validateArchitectureConfiguration } from '../configuration/architecture.mjs'
import { checkGitGovernance } from './git-governance.mjs'
import { checkWorkspaceStructure, checkProjectManifests, checkMissingProjectManifests, checkProjectRegistry, checkDependencyGraph, checkReservedControlPlaneDependencies, requiredProjectManifestPath } from './workspace-checks-foundation.mjs'
import { checkPackageManagerArchitecture } from './workspace-checks-package-management.mjs'
import { checkTypeScriptConfiguration, checkTypeScriptTaskCoverage, checkTypeScriptArchitecture } from './workspace-checks-typescript.mjs'
import { checkUiRegistryWorkflow } from './workspace-checks-ui.mjs'
import { checkServerFeatureArchitecture, checkPackageLocalMaintenanceScripts } from './workspace-checks-feature.mjs'
import { validateArchitectureBoundaries } from '../validators/architecture-boundaries.mjs'
import { workspaceRoots } from '../workspace/discovery.mjs'

export { checkWorkspaceStructure, checkProjectManifests, checkMissingProjectManifests, checkProjectRegistry, checkDependencyGraph, checkReservedControlPlaneDependencies, checkPackageManagerArchitecture, checkTypeScriptConfiguration, checkUiRegistryWorkflow, checkTypeScriptTaskCoverage, checkTypeScriptArchitecture, checkServerFeatureArchitecture, checkPackageLocalMaintenanceScripts, requiredProjectManifestPath, workspaceRoots }

const checkTaskGraph = (workspace) => {
    const graph = createDependencyGraph(workspace.projects)
    const tasks = listTasks(workspace.projects)
    const messages = new Set()
    for (const task of tasks) {
        try {
            createExecutionPlan({ graph, projects: workspace.projects, tasks, taskName: task.id })
        } catch (error) {
            messages.add(error instanceof Error ? error.message : String(error))
        }
    }
    return [...messages].map((message) => ({ level: 'error', message }))
}

export const runWorkspaceChecks = async (workspace) => [
    ...validateArchitectureConfiguration(workspace.architecture),
    ...await checkWorkspaceStructure(workspace),
    ...await checkMissingProjectManifests(workspace),
    ...checkProjectManifests(workspace),
    ...checkProjectRegistry(workspace),
    ...checkDependencyGraph(workspace),
    ...checkTaskGraph(workspace),
    ...await checkReservedControlPlaneDependencies(workspace),
    ...await checkGitGovernance(workspace),
    ...await checkPackageManagerArchitecture(workspace),
    ...await checkTypeScriptConfiguration(workspace),
    ...await checkUiRegistryWorkflow(workspace),
    ...await checkTypeScriptTaskCoverage(workspace),
    ...await checkTypeScriptArchitecture(workspace),
    ...await checkServerFeatureArchitecture(workspace),
    ...await checkPackageLocalMaintenanceScripts(workspace),
    ...await validateArchitectureBoundaries(workspace)
];
