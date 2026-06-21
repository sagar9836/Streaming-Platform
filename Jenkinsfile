pipeline {
    agent any

    environment {
        DOCKER_IMAGE = "9836sagar9836/video-platform-api"
        SONAR_TOKEN = credentials('sonar-token')
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

        stage('Checkout') {
            steps {
                git branch: 'main',
                url: 'https://github.com/sagar9836/Streaming-Platform.git'
            }
        }

        stage('SonarQube Analysis') {
            steps {
                withSonarQubeEnv('sonarqube') {
                    sh '''
                    sonar-scanner \
                    -Dsonar.projectKey=video-platform \
                    -Dsonar.sources=. \
                    -Dsonar.host.url=http://13.232.118.249:9000 \
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
                --exit-code 1
                '''
            }
        }

        stage('Build Docker Image') {
            steps {
                sh '''
                docker build -t $DOCKER_IMAGE:${BUILD_NUMBER} ./backend
                '''
            }
        }

        stage('Trivy Image Scan') {
            steps {
                sh '''
                trivy image $DOCKER_IMAGE:${BUILD_NUMBER} \
                --severity HIGH,CRITICAL \
                --format table \
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
                    docker push $DOCKER_IMAGE:${BUILD_NUMBER}
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
        success {
            echo 'Pipeline completed successfully.'
        }

        failure {
            echo 'Pipeline failed.'
        }
    }
}
