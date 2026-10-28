const AuthError = require('../AuthError');
const RegisterUserDto = require('../dto/RegisterUserDto');

class RegisterUser {
  constructor({ authRepository, passwordHasher, otpService, emailOtpSender }) {
    this.authRepository = authRepository;
    this.passwordHasher = passwordHasher;
    this.otpService = otpService;
    this.emailOtpSender = emailOtpSender;
  }

  async execute(input) {
    const dto = RegisterUserDto.from(input);
    const existingUser = await this.authRepository.findUserByEmail(dto.email);

    if (existingUser) {
      throw new AuthError(409, 'An account with this email already exists.');
    }

    const passwordHash = await this.passwordHasher.hash(dto.password);
    const otp = this.otpService.create();

    await this.authRepository.savePendingRegistration({
      name: dto.name,
      phno: dto.phno,
      email: dto.email,
      passwordHash,
      otpHash: otp.hash,
      otpExpiresAt: otp.expiresAt,
    });
    await this.emailOtpSender.sendVerificationOtp(dto.email, otp.code);

    return {
      email: dto.email,
      message: 'Registration started. Enter the verification code sent to your email.',
    };
  }
}

module.exports = RegisterUser;