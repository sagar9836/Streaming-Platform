pipeline {
    agent any

 
    environment {
        SONAR_PROJECT_KEY = 'video-platform'
        SONAR_HOST_URL    = 'http://13.232.118.249:9000'
        DOCKER_IMAGE = "9836sagar9836/video-platform-api"
        SONAR_TOKEN = credentials('sonar-token')
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

        stage('Prepare Trivy Reports') {
            steps {
                sh '''
                mkdir -p ${TRIVY_REPORT_DIR}
                '''
            }
        }


        stage('SonarQube Analysis') {
            steps {
                echo 'Running SonarQube code analysis...'
                withSonarQubeEnv('sonarqube') {
                    script {
                        def scannerHome = tool 'sonar-scanner'
                        sh """
                            ${scannerHome}/bin/sonar-scanner \
                              -Dsonar.projectKey=${SONAR_PROJECT_KEY} \
                              -Dsonar.sources=. \
                              -Dsonar.host.url=${SONAR_HOST_URL} \
                              -Dsonar.token=${SONAR_TOKEN}
                        """
                    }
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
    }
}
