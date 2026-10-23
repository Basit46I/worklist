export const validateArchitecturePlatform = (architecture, issues) => {
    const security = architecture.security
    if (!security || typeof security !== 'object') {
        issues.push({ level: 'error', message: 'Architecture policy is missing security tool orchestration rules.' })
    } else {
        if (security.model !== 'standard-engines-repository-policy') {
            issues.push({ level: 'error', message: 'Architecture security must separate standard engines from repository policy.' })
        }
        if (
            security.dependencyAudit?.engine !== 'pnpm-audit' ||
            !['low', 'moderate', 'high', 'critical'].includes(security.dependencyAudit?.minimumSeverity)
        ) {
            issues.push({ level: 'error', message: 'Architecture dependency security must configure pnpm audit with a valid minimum severity.' })
        }
        if (
            security.secretScan?.engine !== 'trufflehog' ||
            !/^\d+\.\d+\.\d+$/.test(security.secretScan?.version ?? '') ||
            typeof security.secretScan?.configuration !== 'string' ||
            security.secretScan.configuration.length === 0 ||
            security.secretScan?.execution !== 'managed-binary' ||
            security.secretScan?.scanMode !== 'filesystem' ||
            !Array.isArray(security.secretScan?.resultClasses) ||
            !['verified', 'unknown', 'unverified'].every((item) => security.secretScan.resultClasses.includes(item))
        ) {
            issues.push({
                level: 'error',
                message: 'Architecture secret security must configure pinned, managed TruffleHog filesystem scanning for every result class.'
            })
        }
    }
    if (
        architecture.contractOwnership?.sharedTypesRoot !== 'packages/types' ||
        architecture.contractOwnership?.extractionRule !== 'genuine-cross-boundary-reuse'
    ) {
        issues.push({ level: 'error', message: 'Architecture contract ownership must preserve categorized shared types and earned extraction.' })
    }
    if (!Array.isArray(architecture.testingModel?.levels) || architecture.testingModel?.principle !== 'behavior-and-boundaries-not-files') {
        issues.push({ level: 'error', message: 'Architecture testing model must define behavior-focused test levels.' })
    }
    if (architecture.workspaceModel?.repositoryIsWorkspace !== true || architecture.workspaceModel?.mandatoryProjectNamespace !== false) {
        issues.push({
            level: 'error',
            message: 'Architecture workspace model must define the repository as the workspace without a mandatory project namespace.'
        })
    }
    if (
        architecture.featureModel?.ownership !== 'feature-first' ||
        architecture.featureModel?.serverLayout !== 'flat-files-by-default' ||
        typeof architecture.featureModel?.serverFeatureRoot !== 'string' ||
        typeof architecture.featureModel?.serverFeatureRegistrationFile !== 'string' ||
        typeof architecture.featureModel?.serverRouteFileSuffix !== 'string' ||
        architecture.featureModel?.serverFeatureLayers?.strategy !== 'progressive-categorized-when-justified' ||
        architecture.featureModel?.serverFeatureLayers?.publicEntry !== 'index.ts' ||
        !architecture.featureModel?.serverFeatureLayers?.optional ||
        typeof architecture.featureModel.serverFeatureLayers.optional !== 'object'
    ) {
        issues.push({ level: 'error', message: 'Architecture feature model must be feature-first with flat server files by default.' })
    }
    const gitGovernance = architecture.gitGovernance
    if (
        !gitGovernance ||
        gitGovernance.hooks !== 'husky' ||
        gitGovernance.commitMessages !== 'commitlint' ||
        gitGovernance.commitConvention !== 'conventional-commits' ||
        gitGovernance.stagedFiles !== 'lint-staged' ||
        gitGovernance.defaultBranch !== 'main' ||
        gitGovernance.mergeStrategy !== 'squash' ||
        gitGovernance.requiredStatusCheck !== 'validate' ||
        gitGovernance.signedCommits !== 'optional' ||
        typeof gitGovernance.branchPattern !== 'string' ||
        !Array.isArray(gitGovernance.codeOwners) ||
        !gitGovernance.tools ||
        typeof gitGovernance.tools !== 'object'
    ) {
        issues.push({
            level: 'error',
            message: 'Architecture Git governance must define the Husky, Commitlint, lint-staged, review, and main-branch contract.'
        })
    } else {
        try {
            new RegExp(gitGovernance.branchPattern)
        } catch {
            issues.push({ level: 'error', message: 'Architecture Git governance branchPattern must be a valid regular expression.' })
        }
    }
    if (
        architecture.growthModel?.categorizationRule !== 'meaningful-ownership-or-growth' ||
        architecture.growthModel?.commonFileCountHeuristic !== 3 ||
        architecture.growthModel?.fileCountIsMandatoryThreshold !== false
    ) {
        issues.push({
            level: 'error',
            message: 'Architecture growth model must treat file count as a heuristic, not a mandatory category threshold.'
        })
    }
    return issues
}
