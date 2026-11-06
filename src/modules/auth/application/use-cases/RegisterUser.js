const AuthError = require('../../domain/errors/AuthError');
const RegisterUserDto = require('../dto/RegisterUserDto');

class RegisterUser {
  constructor({
    authRepository,
    passwordHasher,
    otpService,
    emailOtpSender,
    profileImageStorage,
    identityDocumentStorage,
  }) {
    this.authRepository = authRepository;
    this.passwordHasher = passwordHasher;
    this.otpService = otpService;
    this.emailOtpSender = emailOtpSender;
    this.profileImageStorage = profileImageStorage;
    this.identityDocumentStorage = identityDocumentStorage;
  }

  async execute(input, files = {}) {
    const dto = RegisterUserDto.from(input);
    const existingUser = await this.authRepository.findUserByEmail(dto.email);

    if (existingUser) {
      throw new AuthError(409, 'An account with this email already exists.');
    }

    const categories = await this.authRepository.findCategoriesByIds(dto.categoryIds);
    if (categories.length !== dto.categoryIds.length) {
      throw new AuthError(400, 'One or more selected player categories are invalid.');
    }

    const frontIdFile = files.frontIdImg?.[0];
    const backIdFile = files.backIdImg?.[0];
    const profileImageFile = files.profileImage?.[0];
    if (!frontIdFile || !backIdFile) {
      throw new AuthError(400, 'Upload both frontIdImg and backIdImg files.');
    }

    const storedFiles = {};
    let pendingSaved = false;
    try {
      if (profileImageFile) {
        storedFiles.profileImageUrl = await this.profileImageStorage.save(profileImageFile.buffer);
      }
      storedFiles.frontIdImg = await this.identityDocumentStorage.save(frontIdFile.buffer);
      storedFiles.backIdImg = await this.identityDocumentStorage.save(backIdFile.buffer);

      const previousPending = await this.authRepository.findPendingRegistration(dto.email);
      const passwordHash = await this.passwordHasher.hash(dto.password);
      const otp = this.otpService.create();

      await this.authRepository.savePendingRegistration({
        name: dto.name,
        gender: dto.gender,
        phno: dto.phno,
        email: dto.email,
        passwordHash,
        profileImageUrl: storedFiles.profileImageUrl ?? null,
        frontIdImg: storedFiles.frontIdImg,
        backIdImg: storedFiles.backIdImg,
        categoryIds: dto.categoryIds,
        otpHash: otp.hash,
        otpExpiresAt: otp.expiresAt,
      });
      pendingSaved = true;

      if (previousPending) {
        await this.removePendingFiles(previousPending);
      }

      await this.emailOtpSender.sendVerificationOtp(dto.email, otp.code);
    } catch (error) {
      if (!pendingSaved) {
        await this.removeStoredFiles(storedFiles);
      }
      throw error;
    }

    return {
      email: dto.email,
      message: 'Registration started. Enter the verification code sent to your email.',
    };
  }

  async removePendingFiles(pending) {
    await this.removeStoredFiles({
      profileImageUrl: pending.profileImageUrl,
      frontIdImg: pending.frontIdImg,
      backIdImg: pending.backIdImg,
    });
  }

  async removeStoredFiles(files) {
    const removals = [];
    if (files.profileImageUrl) {
      removals.push(this.profileImageStorage.remove(files.profileImageUrl));
    }
    for (const filename of [files.frontIdImg, files.backIdImg]) {
      if (filename) {
        removals.push(this.identityDocumentStorage.remove(filename));
      }
    }

    const results = await Promise.allSettled(removals);
    for (const result of results) {
      if (result.status === 'rejected') {
        console.error('Failed to clean up pending registration uploads:', result.reason);
      }
    }
  }
}

module.exports = RegisterUser;