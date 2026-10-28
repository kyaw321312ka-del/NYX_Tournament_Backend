class PendingRegistration {
  constructor(record) {
    Object.assign(this, record);
  }

  static fromRecord(record) {
    return record ? new PendingRegistration(record) : null;
  }
}

module.exports = PendingRegistration;