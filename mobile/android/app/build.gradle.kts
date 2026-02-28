plugins {
    id("com.android.application")
    id("kotlin-android")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

import java.util.Properties
import org.jetbrains.kotlin.gradle.dsl.JvmTarget

android {
    namespace = "com.bais.bais_attendance"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    val releaseSigningPropsFile = rootProject.file("key.properties")
    val hasReleaseSigning = releaseSigningPropsFile.exists()

    if (hasReleaseSigning) {
        signingConfigs {
            create("release") {
                val props = Properties()
                releaseSigningPropsFile.inputStream().use { props.load(it) }

                val storeFilePath = (props["storeFile"] as String?)?.trim().orEmpty()
                if (storeFilePath.isEmpty()) {
                    throw GradleException("key.properties storeFile is missing")
                }

                storeFile = file(storeFilePath)
                storePassword = (props["storePassword"] as String?)?.trim()
                keyAlias = (props["keyAlias"] as String?)?.trim()
                keyPassword = (props["keyPassword"] as String?)?.trim()
            }
        }
    }

    compileOptions {
        isCoreLibraryDesugaringEnabled = true
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlin {
        compilerOptions {
            jvmTarget.set(JvmTarget.JVM_17)
        }
    }

    defaultConfig {
        // TODO: Specify your own unique Application ID (https://developer.android.com/studio/build/application-id.html).
        applicationId = "com.bais.bais_attendance"
        // You can update the following values to match your application needs.
        // For more information, see: https://flutter.dev/to/review-gradle-config.
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    buildTypes {
        release {
            signingConfig = if (hasReleaseSigning) {
                signingConfigs.getByName("release")
            } else {
                signingConfigs.getByName("debug")
            }
        }
    }
}

dependencies {
    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.0.4")
}

flutter {
    source = "../.."
}
