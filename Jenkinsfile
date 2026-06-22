pipeline {
    agent any

    environment {
        DOCKER_IMAGE = "9836sagar9836/video-platform-api"
        TRIVY_REPORT_DIR = "trivy-reports"
    }

    stages {

        stage('Verify Tools') {
            steps {
                sh '''
                java -version
                docker --version
                trivy --version
                '''
            }
        }

        stage('Prepare Reports') {
            steps {
                sh '''
                mkdir -p ${TRIVY_REPORT_DIR}
                '''
            }
        }

        stage('Trivy File System Scan') {
            steps {
                sh '''
                trivy fs . \
                --severity HIGH,CRITICAL \
                --format table \
                --output ${TRIVY_REPORT_DIR}/trivy-fs-report.txt \
                --exit-code 0
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
                --exit-code 0
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
                docker compose pull
                docker compose up -d
                '''
            }
        }
    }

    post {
        always {
            archiveArtifacts artifacts: 'trivy-reports/*.txt', allowEmptyArchive: true
        }
    }
}
