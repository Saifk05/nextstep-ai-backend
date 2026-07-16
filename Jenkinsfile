pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()

        buildDiscarder(
            logRotator(
                numToKeepStr: '10',
                artifactNumToKeepStr: '5'
            )
        )
    }

    environment {
        APP_NAME = 'nextstep-ai-backend'
        IMAGE_TAG = "${BUILD_NUMBER}"
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm

                powershell '''
                    Write-Host "Branch: $env:BRANCH_NAME"
                    Write-Host "Build: $env:BUILD_NUMBER"
                    git log -1 --oneline

                    if ($LASTEXITCODE -ne 0) {
                        throw "Git checkout verification failed"
                    }
                '''
            }
        }

        stage('Install Dependencies') {
            steps {
                powershell '''
                    npm ci

                    if ($LASTEXITCODE -ne 0) {
                        throw "npm ci failed"
                    }
                '''
            }
        }

        stage('Lint Check') {
            steps {
                powershell '''
                    npm run lint

                    if ($LASTEXITCODE -ne 0) {
                        Write-Warning "Lint issues found. Continuing temporarily."
                        exit 0
                    }
                '''
            }
        }

        stage('Unit Tests') {
            steps {
                powershell '''
                    npm run test:ci

                    if ($LASTEXITCODE -ne 0) {
                        throw "Unit tests failed"
                    }
                '''
            }
        }

        stage('NestJS Build') {
            steps {
                powershell '''
                    npm run build

                    if ($LASTEXITCODE -ne 0) {
                        throw "NestJS build failed"
                    }

                    if (-not (Test-Path ".\\dist\\main.js")) {
                        throw "dist/main.js was not generated"
                    }

                    Write-Host "NestJS build completed successfully."
                '''
            }
        }

        stage('Docker Build') {
            steps {
                powershell '''
                    docker build `
                        --tag "${env:APP_NAME}:${env:IMAGE_TAG}" `
                        --tag "${env:APP_NAME}:latest" `
                        .

                    if ($LASTEXITCODE -ne 0) {
                        throw "Docker image build failed"
                    }
                '''
            }
        }

        stage('Docker Image Check') {
            steps {
                powershell '''
                    docker image inspect "${env:APP_NAME}:${env:IMAGE_TAG}"

                    if ($LASTEXITCODE -ne 0) {
                        throw "Docker image inspection failed"
                    }

                    docker images $env:APP_NAME
                '''
            }
        }

        stage('Deploy Preprod') {
            when {
                branch 'preprod'
            }

            steps {
                withCredentials([
                    string(
                        credentialsId: 'nextstep-render-preprod-hook',
                        variable: 'RENDER_DEPLOY_HOOK'
                    )
                ]) {
                    powershell '''
                        Invoke-RestMethod `
                            -Method Post `
                            -Uri $env:RENDER_DEPLOY_HOOK

                        Write-Host "Render preprod deployment triggered."
                    '''
                }
            }
        }
    }

    post {
        success {
            echo 'NextStep AI backend pipeline completed successfully.'
        }

        failure {
            echo "Pipeline failed. Check: ${env.BUILD_URL}"
        }

        always {
            powershell '''
                docker image rm `
                    "${env:APP_NAME}:${env:IMAGE_TAG}" `
                    --force 2>$null

                exit 0
            '''

            cleanWs()
        }
    }
}