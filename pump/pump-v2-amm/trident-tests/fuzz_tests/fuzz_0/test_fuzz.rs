use pump_v2_amm::entry;
use pump_v2_amm::ID as PROGRAM_ID;
use fuzz_instructions::pump_v2_amm_fuzz_instructions::FuzzInstruction;
use trident_client::{convert_entry, fuzz_trident, fuzzing::*};
mod accounts_snapshots;
mod fuzz_instructions;

const PROGRAM_NAME: &str = "pump_v2_amm";

struct MyFuzzData;

impl FuzzDataBuilder<FuzzInstruction> for MyFuzzData {}

fn main() {
    loop {
        fuzz_trident!(fuzz_ix: FuzzInstruction, |fuzz_data: MyFuzzData| {
            let mut client =
                ProgramTestClientBlocking::new(PROGRAM_NAME, PROGRAM_ID, processor!(convert_entry!(entry)))
                    .unwrap();
            let _ = fuzz_data.run_with_runtime(PROGRAM_ID, &mut client);
        });
    }
}
