pipeline {
    agent any

    options {
        skipDefaultCheckout(true)
    }

    environment {
        DOCKER_IMAGE = "9836sagar9836/video-platform-api"
        SONAR_TOKEN = credentials('sonar-token')
        TRIVY_REPORT_DIR = "trivy-reports"
    }

    stages {

        stage('Verify Tools') {
            steps {
                sh '''
                echo "Verifying tools..."
                java -version
                docker --version
                trivy --version
                sonar-scanner --version
                '''
            }
        }

        stage('Checkout') {
            steps {
                git branch: 'main',
                url: 'https://github.com/sagar9836/Streaming-Platform.git'
            }
        }

        stage('Prepare Trivy Reports') {
            steps {
                sh '''
                mkdir -p ${TRIVY_REPORT_DIR}

                touch ${TRIVY_REPORT_DIR}/trivy-fs-report.txt
                touch ${TRIVY_REPORT_DIR}/trivy-image-report.txt
                '''
            }
        }

        stage('SonarQube Analysis') {
            steps {
                withSonarQubeEnv('sonarqube') {
                    sh '''
                    sonar-scanner \
                      -Dsonar.projectKey=video-platform \
                      -Dsonar.sources=. \
                      -Dsonar.host.url=$SONAR_HOST_URL \
                      -Dsonar.login=$SONAR_TOKEN
                    '''
                }
            }
        }

        stage('Trivy File Scan') {
            steps {
                sh '''
                trivy fs . \
                  --severity HIGH,CRITICAL \
                  --format table \
                  --output ${TRIVY_REPORT_DIR}/trivy-fs-report.txt \
                  --exit-code 1
                '''
            }
        }

        stage('Build Docker Image') {
            steps {
                sh '''
                docker build -t ${DOCKER_IMAGE}:${BUILD_NUMBER} ./backend
                docker tag ${DOCKER_IMAGE}:${BUILD_NUMBER} ${DOCKER_IMAGE}:latest
                '''
            }
        }

        stage('Trivy Image Scan') {
            steps {
                sh '''
                trivy image ${DOCKER_IMAGE}:${BUILD_NUMBER} \
                  --severity HIGH,CRITICAL \
                  --format table \
                  --output ${TRIVY_REPORT_DIR}/trivy-image-report.txt \
                  --exit-code 1
                '''
            }
        }

        stage('Push Docker Image') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'dockerhub-creds',
                        usernameVariable: 'DOCKER_USER',
                        passwordVariable: 'DOCKER_PASS'
                    )
                ]) {
                    sh '''
                    echo $DOCKER_PASS | docker login -u $DOCKER_USER --password-stdin

                    docker push ${DOCKER_IMAGE}:${BUILD_NUMBER}
                    docker push ${DOCKER_IMAGE}:latest
                    '''
                }
            }
        }

        stage('Deploy') {
            steps {
                sh '''
                docker compose down
                docker compose up -d --build
                '''
            }
        }
    }

    post {
        always {
            archiveArtifacts artifacts: 'trivy-reports/*.txt', allowEmptyArchive: true
        }

        success {
            echo 'Pipeline completed successfully.'
        }

        failure {
            echo 'Pipeline failed.'
        }
    }
}
